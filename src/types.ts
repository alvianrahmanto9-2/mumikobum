export type ClassType = 'Praremaja' | 'Remaja';
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Alfa';

export interface Student {
  id: string;
  name: string;
  classType: ClassType;
  joinDate: string;
  active: boolean;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  teacherName: string;
  classType: ClassType;
}

export interface Config {
  teachers: string[];
}
