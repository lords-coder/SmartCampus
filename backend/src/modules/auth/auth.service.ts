import { queryOne, withTransaction } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { Role } from "../../utils/roles";
import { LoginInput, RegisterInput } from "./auth.schemas";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface StudentProfile {
  studentNo: string;
  department: string;
  semester: number;
  section: string;
  batchYear: number;
}

export interface FacultyProfile {
  employeeNo: string;
  department: string;
  designation: string;
}

export interface ParentLinkedStudent {
  studentId: string;
  studentNo: string;
  name: string;
  department: string;
  semester: number;
  section: string;
  relationshipType: string;
}

export interface ParentProfile {
  linkedStudents: ParentLinkedStudent[];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
  created_at: Date;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await queryOne("SELECT id FROM users WHERE lower(email) = lower($1)", [input.email]);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, password_hash, created_at`,
      [input.name, input.email, passwordHash, input.role],
    );
    const created = rows[0];

    if (input.role === "STUDENT") {
      await client.query(
        `INSERT INTO students (user_id, student_no, department, semester, section, batch_year)
         VALUES ($1,
                 'SC' || to_char(now(), 'YYYY') || '-' || lpad(nextval('student_no_seq')::text, 3, '0'),
                 'Unassigned', 1, 'A',
                 extract(year from now())::int)`,
        [created.id],
      );
    } else {
      await client.query(
        `INSERT INTO faculties (user_id, employee_no, department, designation)
         VALUES ($1, 'EMP-' || lpad(nextval('faculty_no_seq')::text, 4, '0'), 'Unassigned', 'Faculty')`,
        [created.id],
      );
    }

    return created;
  });

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  return { token, user: toPublicUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const row = await queryOne<UserRow>(
    `SELECT id, name, email, role, password_hash, created_at
     FROM users WHERE lower(email) = lower($1)`,
    [input.email],
  );

  const valid = row ? await verifyPassword(input.password, row.password_hash) : false;
  if (!row || !valid) {
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = signToken({ sub: row.id, role: row.role, email: row.email });
  return { token, user: toPublicUser(row) };
}

export async function getCurrentUser(userId: string) {
  const user = await queryOne<UserRow>(
    `SELECT id, name, email, role, password_hash, created_at FROM users WHERE id = $1`,
    [userId],
  );
  if (!user) {
    throw ApiError.unauthorized("Account no longer exists", "INVALID_TOKEN");
  }

  let profile: StudentProfile | FacultyProfile | ParentProfile | null = null;
  if (user.role === "STUDENT") {
    const student = await queryOne<{
      student_no: string;
      department: string;
      semester: number;
      section: string;
      batch_year: number;
    }>(
      `SELECT student_no, department, semester, section, batch_year
       FROM students WHERE user_id = $1`,
      [userId],
    );
    if (student) {
      profile = {
        studentNo: student.student_no,
        department: student.department,
        semester: student.semester,
        section: student.section,
        batchYear: student.batch_year,
      };
    }
  } else if (user.role === "PARENT") {
    const { getLinkedStudents } = await import("../parent/parent.service");
    const linked = await getLinkedStudents(userId);
    profile = {
      linkedStudents: linked.map((s) => ({
        studentId: s.studentId,
        studentNo: s.studentNo,
        name: s.name,
        department: s.department,
        semester: s.semester,
        section: s.section,
        relationshipType: s.relationshipType,
      })),
    };
  } else if (user.role === "FACULTY") {
    const faculty = await queryOne<{ employee_no: string; department: string; designation: string }>(
      `SELECT employee_no, department, designation FROM faculties WHERE user_id = $1`,
      [userId],
    );
    if (faculty) {
      profile = {
        employeeNo: faculty.employee_no,
        department: faculty.department,
        designation: faculty.designation,
      };
    }
  }

  return { user: toPublicUser(user), profile };
}
