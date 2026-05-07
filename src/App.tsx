import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Users, 
  ClipboardCheck, 
  PieChart, 
  Settings as SettingsIcon, 
  Home as HomeIcon,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, signInWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { Student, AttendanceRecord, ClassType, AttendanceStatus } from './types';
import { cn } from './lib/utils';

// --- Components ---

const ViewWrapper = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-4 pb-24 md:pb-8 max-w-2xl mx-auto w-full"
  >
    {children}
  </motion.div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'students' | 'attendance' | 'monitoring' | 'settings'>('home');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<string[]>(['Guru A', 'Guru B', 'Guru C']);
  const [loadingData, setLoadingData] = useState(true);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const unsubStudents = onSnapshot(collection(db, 'students'), 
      (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(studentData);
        setLoadingData(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'students')
    );

    const unsubConfig = onSnapshot(doc(db, 'config', 'teachers'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setTeachers(docSnap.data().names || []);
        } else {
          // Initialize if not exists
          setDoc(doc(db, 'config', 'teachers'), { names: ['Guru A', 'Guru B', 'Guru C'] });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'config/teachers')
    );

    return () => {
      unsubStudents();
      unsubConfig();
    };
  }, [user]);

  if (loadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6"
        >
          <div className="bg-indigo-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-10 h-10 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Absensi Remaja Masjid</h1>
            <p className="text-gray-500 mt-2">Masuk untuk mencatat dan memantau kehadiran santri.</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 px-6 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5" alt="Google" />
            Masuk dengan Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <ClipboardCheck size={20} />
          </div>
          <span className="font-bold text-gray-900">Remaja Masjid</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-xs font-medium text-gray-900">{user.displayName}</span>
            <span className="text-[10px] text-gray-500">{user.email}</span>
          </div>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <ViewWrapper key="home">
              <HomeView 
                students={students} 
                teachers={teachers} 
                onNavigate={(view) => setActiveView(view as any)}
                user={user}
              />
            </ViewWrapper>
          )}
          {activeView === 'students' && (
            <ViewWrapper key="students">
              <StudentsView students={students} />
            </ViewWrapper>
          )}
          {activeView === 'attendance' && (
            <ViewWrapper key="attendance">
              <AttendanceView students={students} teachers={teachers} />
            </ViewWrapper>
          )}
          {activeView === 'monitoring' && (
            <ViewWrapper key="monitoring">
              <MonitoringView students={students} />
            </ViewWrapper>
          )}
          {activeView === 'settings' && (
            <ViewWrapper key="settings">
              <SettingsView teachers={teachers} setTeachers={setTeachers} />
            </ViewWrapper>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="bg-white border-t border-gray-100 px-2 py-2 flex items-center justify-around fixed bottom-0 left-0 right-0 z-20 md:relative md:border-t-0 md:bg-transparent md:mb-4 md:px-0">
        <div className="flex items-center gap-1 md:gap-4 bg-white md:bg-white md:shadow-lg md:rounded-full md:px-6 md:py-2 md:mx-auto">
          <NavButton active={activeView === 'home'} onClick={() => setActiveView('home')} icon={<HomeIcon size={20} />} label="Beranda" />
          <NavButton active={activeView === 'attendance'} onClick={() => setActiveView('attendance')} icon={<ClipboardCheck size={20} />} label="Absensi" />
          <NavButton active={activeView === 'students'} onClick={() => setActiveView('students')} icon={<Users size={20} />} label="Santri" />
          <NavButton active={activeView === 'monitoring'} onClick={() => setActiveView('monitoring')} icon={<PieChart size={20} />} label="Rekap" />
          <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20} />} label="Atur" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
        active ? "text-indigo-600 bg-indigo-50 font-semibold" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
      )}
    >
      {icon}
      <span className="text-[10px] md:text-sm">{label}</span>
    </button>
  );
}

// --- Sub-Views ---

function HomeView({ students, teachers, onNavigate, user }: { students: Student[], teachers: string[], onNavigate: (v: string) => void, user: any }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-indigo-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-indigo-100 text-sm font-medium">Selamat datang,</p>
          <h2 className="text-2xl font-bold">{user.displayName?.split(' ')[0] || 'Guru'}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold">Total Santri</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold">Guru Aktif</p>
              <p className="text-2xl font-bold">{teachers.length}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl translate-y-12 -translate-x-12"></div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => onNavigate('attendance')}
          className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all active:scale-98 group"
        >
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ClipboardCheck size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">Catat Absensi</h3>
            <p className="text-sm text-gray-500">Input kehadiran hari ini</p>
          </div>
          <ChevronRight className="ml-auto text-gray-300" size={20} />
        </button>

        <button 
          onClick={() => onNavigate('monitoring')}
          className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-all active:scale-98 group"
        >
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <PieChart size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">Rekapitulasi</h3>
            <p className="text-sm text-gray-500">Lihat statistik & laporan</p>
          </div>
          <ChevronRight className="ml-auto text-gray-300" size={20} />
        </button>

        <button 
          onClick={() => onNavigate('students')}
          className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-amber-200 transition-all active:scale-98 group"
        >
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Users size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">Data Santri</h3>
            <p className="text-sm text-gray-500">Kelola data per kelas</p>
          </div>
          <ChevronRight className="ml-auto text-gray-300" size={20} />
        </button>
      </div>
    </div>
  );
}

function StudentsView({ students }: { students: Student[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [classType, setClassType] = useState<ClassType>('Praremaja');

  const filteredStudents = useMemo(() => ({
    praremaja: students.filter(s => s.classType === 'Praremaja'),
    remaja: students.filter(s => s.classType === 'Remaja'),
  }), [students]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'students', editingId), { name, classType });
      } else {
        await addDoc(collection(db, 'students'), {
          name,
          classType,
          joinDate: new Date().toISOString(),
          active: true
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'students');
    }
  };

  const handleEdit = (s: Student) => {
    setEditingId(s.id);
    setName(s.name);
    setClassType(s.classType);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus santri ini?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  };

  const resetForm = () => {
    setName('');
    setClassType('Praremaja');
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Manajemen Santri</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white p-2 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Santri</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kelas</label>
              <div className="flex gap-2">
                {(['Praremaja', 'Remaja'] as ClassType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setClassType(type)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-xl border text-sm font-medium transition-all",
                      classType === type ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah Santri'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-8">
        <StudentListSection 
          title="Kelas Praremaja (SMP)" 
          students={filteredStudents.praremaja} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
        <StudentListSection 
          title="Kelas Remaja (SMA+)" 
          students={filteredStudents.remaja} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
      </div>
    </div>
  );
}

function StudentListSection({ title, students, onEdit, onDelete }: { title: string, students: Student[], onEdit: (s: Student) => void, onDelete: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-gray-400">
        <div className="h-px flex-1 bg-gray-200"></div>
        <span className="text-[10px] uppercase tracking-widest font-bold">{title}</span>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>
      {students.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-4 italic">Belum ada data santri</p>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <span className="font-semibold text-gray-800">{s.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(s)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Plus size={18} className="rotate-45" /> {/* Just to look like an edit icon or pen */}
                  <span className="sr-only">Edit</span>
                  <SettingsIcon size={16} />
                </button>
                <button 
                  onClick={() => onDelete(s.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceView({ students, teachers }: { students: Student[], teachers: string[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeacher, setSelectedTeacher] = useState(teachers[0] || '');
  const [selectedClass, setSelectedClass] = useState<ClassType>('Praremaja');
  
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacher) {
      setSelectedTeacher(teachers[0]);
    }
  }, [teachers]);

  const classStudents = useMemo(() => 
    students.filter(s => s.classType === selectedClass), 
  [students, selectedClass]);

  // Load existing attendance if any
  useEffect(() => {
    const loadExisting = async () => {
      const q = query(
        collection(db, 'attendance'), 
        where('date', '==', selectedDate),
        where('classType', '==', selectedClass)
      );
      const snap = await getDocs(q);
      const map: Record<string, AttendanceStatus> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.studentId] = data.status as AttendanceStatus;
      });
      setAttendanceMap(map);
    };
    loadExisting();
  }, [selectedDate, selectedClass]);

  const handleUpdateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAll = async () => {
    if (!selectedTeacher) return alert('Pilih guru penginput');
    setSaving(true);
    try {
      // In a real app, you'd use batch ops, but here we do it simple
      const promises = Object.entries(attendanceMap).map(async ([studentId, status]) => {
        // Find if record exists
        const q = query(
          collection(db, 'attendance'), 
          where('date', '==', selectedDate),
          where('studentId', '==', studentId)
        );
        const snap = await getDocs(q);
        
        const record: Partial<AttendanceRecord> = {
          studentId,
          date: selectedDate,
          status,
          teacherName: selectedTeacher,
          classType: selectedClass
        };

        if (!snap.empty) {
          await updateDoc(doc(db, 'attendance', snap.docs[0].id), record);
        } else {
          await addDoc(collection(db, 'attendance'), record);
        }
      });

      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
          <ClipboardCheck size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Input Absensi</h2>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 ml-1">Pilih Tanggal</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 ml-1">Nama Guru</label>
            <select 
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="">-- Pilih Guru --</option>
              {teachers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          {(['Praremaja', 'Remaja'] as ClassType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedClass(type)}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                selectedClass === type ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-white/50"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {classStudents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
            <Users className="mx-auto mb-2 opacity-20" size={48} />
            <p>Belum ada santri di kelas ini</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">
              <span>Nama Santri</span>
              <div className="flex gap-4 pr-2">
                <span className="w-10 text-center">H</span>
                <span className="w-10 text-center">I</span>
                <span className="w-10 text-center">A</span>
              </div>
            </div>
            <div className="space-y-2">
              {classStudents.map(s => {
                const status = attendanceMap[s.id];
                return (
                  <div key={s.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">{s.name}</span>
                    <div className="flex gap-2">
                      <AttendanceStatusBtn 
                        active={status === 'Hadir'} 
                        color="green" 
                        onClick={() => handleUpdateStatus(s.id, 'Hadir')} 
                      />
                      <AttendanceStatusBtn 
                        active={status === 'Izin'} 
                        color="amber" 
                        onClick={() => handleUpdateStatus(s.id, 'Izin')} 
                      />
                      <AttendanceStatusBtn 
                        active={status === 'Alfa'} 
                        color="red" 
                        onClick={() => handleUpdateStatus(s.id, 'Alfa')} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving || Object.keys(attendanceMap).length === 0}
              className={cn(
                "w-full py-4 rounded-2xl font-bold border-none text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
                success ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400"
              )}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : success ? (
                <><CheckCircle2 size={20} /> Berhasil Disimpan</>
              ) : (
                <>Simpan Absensi</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AttendanceStatusBtn({ active, color, onClick }: { active: boolean, color: 'green' | 'amber' | 'red', onClick: () => void }) {
  const colors = {
    green: active ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-gray-50 text-gray-300 hover:bg-emerald-50 hover:text-emerald-400",
    amber: active ? "bg-amber-500 text-white shadow-amber-200" : "bg-gray-50 text-gray-300 hover:bg-amber-50 hover:text-amber-400",
    red: active ? "bg-rose-500 text-white shadow-rose-200" : "bg-gray-50 text-gray-300 hover:bg-rose-50 hover:text-rose-400",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm",
        colors[color]
      )}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-current" />
    </button>
  );
}

function MonitoringView({ students }: { students: Student[] }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`; // Rough check for Firestore queries
    
    setLoading(true);
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAllAttendance(data);
      setLoading(false);
    });

    return unsub;
  }, [selectedMonth]);

  const stats = useMemo(() => {
    const studentStats = students.map(s => {
      const records = allAttendance.filter(r => r.studentId === s.id);
      const total = records.length;
      const hadir = records.filter(r => r.status === 'Hadir').length;
      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return { ...s, total, hadir, percentage };
    }).sort((a, b) => b.percentage - a.percentage);

    const overallTotal = allAttendance.length;
    const overallHadir = allAttendance.filter(r => r.status === 'Hadir').length;
    const overallPercentage = overallTotal > 0 ? Math.round((overallHadir / overallTotal) * 100) : 0;

    return { studentStats, overallPercentage, overallTotal, overallHadir };
  }, [students, allAttendance]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Rekap Monitoring</h2>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium outline-none focus:border-indigo-500 shadow-sm"
        />
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
            <circle 
              cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
              className="text-indigo-600"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * stats.overallPercentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xl font-bold text-gray-900">{stats.overallPercentage}%</span>
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-gray-900">Total Kehadiran</h3>
          <p className="text-xs text-gray-500">Seluruh santri di bulan ini</p>
          <div className="pt-2 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Hadir</span>
              <span className="text-lg font-bold text-indigo-600">{stats.overallHadir}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
              <span className="text-lg font-bold text-gray-900">{stats.overallTotal}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">Data Per Santri</h3>
        {loading ? (
           <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>
        ) : stats.studentStats.length === 0 ? (
          <p className="text-center text-gray-400 py-12 italic">Belum ada data absensi di bulan ini</p>
        ) : (
          <div className="space-y-2">
            {stats.studentStats.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{s.name}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold">{s.classType}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-gray-900">{s.percentage}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      s.percentage >= 80 ? "bg-emerald-500" : s.percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>Hadir: {s.hadir}</span>
                  <span>Total Pertemuan: {s.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ teachers, setTeachers }: { teachers: string[], setTeachers: (t: string[]) => void }) {
  const [newNames, setNewNames] = useState(teachers.join('\n'));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    const list = newNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (list.length === 0) return alert('Daftar guru tidak boleh kosong');
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'teachers'), { names: list });
      setTeachers(list);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/teachers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-gray-800 p-2 rounded-xl text-white shadow-md">
          <SettingsIcon size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Pengaturan App</h2>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 mb-1">Daftar Guru Pengajar</h3>
          <p className="text-xs text-gray-500 mb-4">Masukkan nama-nama guru yang bertugas mengabsen (pisahkan dengan baris baru).</p>
          <textarea
            value={newNames}
            onChange={e => setNewNames(e.target.value)}
            rows={6}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 transition-colors font-medium"
            placeholder="Contoh:&#10;Ustadz Ahmad&#10;Ustadzah Khadijah"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
            success ? "bg-emerald-500" : "bg-gray-900 hover:bg-black"
          )}
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : success ? (
            <><CheckCircle2 size={20} /> Tersimpan</>
          ) : (
            <>Simpan Pengaturan</>
          )}
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
        <div className="flex gap-3">
          <Clock className="text-amber-600 shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Informasi Versi</h4>
            <p className="text-xs text-amber-700 mt-1">Aplikasi ini menyimpan data secara real-time ke Cloud Firebase. Pastikan koneksi internet stabil saat melakukan absensi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
