import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Users, Briefcase, CheckSquare, Shield, LogOut, Plus,
  Calendar, FileText, AlertTriangle, CheckCircle, XCircle,
  Clock, Search, BarChart2, LayoutDashboard, History, Menu,
  Lock, Unlock, ChevronDown
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://jqlaitpirnyxwvwkowfz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbGFpdHBpcm55eHd2d2tvd2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MDMsImV4cCI6MjA4NTYwNTYwM30.chqsFBRycbQv-njM9K4w1KWyYsOX6WnnEAkdiHccuco';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Types ---

type Role = {
  id: string;
  name: string;
};

type UserType = 'admin' | 'user';

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  type: UserType;
  roleId?: string; // Optional for admin
  disabled?: boolean;
};

type TaskDefinition = {
  id: string;
  name: string; // Main task name
  subTasks: { id: string; name: string }[];
};

type TaskStatus = 'pending' | 'done' | 'rejected' | 'deficient';

type Assignment = {
  id: string;
  userId: string;
  mainTaskName: string;
  subTaskName?: string; // If specific subtask selected
  date: string; // YYYY-MM-DD
  isRoutine: boolean;
  status: TaskStatus;
  userNote?: string; // For rejection reason or design details
  adminNote?: string; // For deficiency reason
  submitted: boolean; // Locks the task
  isManual?: boolean; // For "Design Offers"
};

type RoutineDefinition = {
  id: string;
  userId: string;
  mainTaskName: string;
  subTaskName?: string;
  isActive: boolean;
};

// --- Mock Data / Initial State ---

const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'المدير العام',
  email: 'dhaibanf@gmail.com',
  password: '1234',
  type: 'admin'
};

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Main Application ---

const App = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);

  // Data Store (Simulating DB)
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([INITIAL_ADMIN]);
  const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);

  // --- Sync with Supabase ---

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: r, error: rErr } = await supabase.from('roles').select('*');
        if (rErr) throw rErr;
        if (r) setRoles(r);

        const { data: u, error: uErr } = await supabase.from('users').select('*');
        if (uErr) throw uErr;

        if (u && u.length > 0) {
          setUsers(u.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            type: user.type,
            roleId: user.role_id,
            disabled: user.disabled
          })));
        } else {
          // First time setup - insert initial admin
          const { error: insErr } = await supabase.from('users').insert([{
            id: INITIAL_ADMIN.id,
            name: INITIAL_ADMIN.name,
            email: INITIAL_ADMIN.email,
            password: INITIAL_ADMIN.password,
            type: INITIAL_ADMIN.type
          }]);
          if (insErr) throw insErr;
          setUsers([INITIAL_ADMIN]);
        }

        const { data: t, error: tErr } = await supabase.from('task_definitions').select('*');
        if (tErr) throw tErr;
        if (t) setTaskDefs(t.map(item => ({ ...item, subTasks: item.sub_tasks })));

        const { data: a, error: aErr } = await supabase.from('assignments').select('*');
        if (aErr) throw aErr;
        if (aErr) {
          console.error("Supabase Fetch Error (assignments):", aErr);
          throw aErr;
        }
        if (a) setAssignments(a.map(item => ({
          id: item.id,
          userId: item.user_id,
          mainTaskName: item.main_task_name,
          subTaskName: item.sub_task_name,
          date: item.date,
          isRoutine: item.is_routine,
          status: item.status,
          userNote: item.user_note,
          adminNote: item.admin_note,
          submitted: item.submitted,
          isManual: item.is_manual
        })));

        const { data: rt, error: rtErr } = await supabase.from('routines').select('*');
        if (rtErr) {
          console.error("Supabase Fetch Error (routines):", rtErr);
          throw rtErr;
        }
        if (rt) setRoutines(rt.map(item => ({
          id: item.id,
          userId: item.user_id,
          mainTaskName: item.main_task_name,
          subTaskName: item.sub_task_name,
          isActive: item.is_active
        })));
      } catch (error: any) {
        console.error("Supabase Fetch Error:", error);
        alert("خطأ في الاتصال بقاعدة البيانات: " + (error.message || "فشل الاتصال"));
      }
    };

    fetchData();

    // Subscribe to Realtime Changes
    const channels = [
      supabase.channel('public:roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, fetchData),
      supabase.channel('public:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchData),
      supabase.channel('public:task_definitions').on('postgres_changes', { event: '*', schema: 'public', table: 'task_definitions' }, fetchData),
      supabase.channel('public:assignments').on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchData),
      supabase.channel('public:routines').on('postgres_changes', { event: '*', schema: 'public', table: 'routines' }, fetchData),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  // Helper sync functions
  const syncRoles = async (newData: Role[]) => {
    setRoles(newData);
    // Note: In a real app, you'd handle specific UPSERTs, but for this simpler sync:
    // This is handled by fetchData on realtime events, but for immediate UI:
    // Logic below for specific actions instead of global useEffect
  };

  // Routine Logic: Generate daily tasks from routines
  useEffect(() => {
    if (!user) return;

    const generateRoutines = async () => {
      const today = getTodayDate();
      const activeRoutines = routines.filter(r => r.isActive);

      const newBatch: any[] = [];

      for (const routine of activeRoutines) {
        const exists = assignments.some(a =>
          a.userId === routine.userId &&
          a.date === today &&
          a.mainTaskName === routine.mainTaskName &&
          a.subTaskName === routine.subTaskName &&
          a.isRoutine
        );

        if (!exists) {
          newBatch.push({
            id: generateId(),
            user_id: routine.userId,
            main_task_name: routine.mainTaskName,
            sub_task_name: routine.subTaskName,
            date: today,
            is_routine: true,
            status: 'pending',
            submitted: false
          });
        }
      }

      if (newBatch.length > 0) {
        await supabase.from('assignments').insert(newBatch);
        // fetchData will be triggered by realtime
      }
    };

    generateRoutines();
  }, [user, routines, assignments.length]);


  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent, email: string, pass: string) => {
    e.preventDefault();
    const foundUser = users.find(u => u.email === email && u.password === pass);
    if (foundUser) {
      if (foundUser.disabled) {
        return alert('هذا الحساب معطل حالياً. يرجى مراجعة الإدارة.');
      }
      setUser(foundUser);
    } else {
      alert('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = () => setUser(null);

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="font-cairo selection:bg-red-100 selection:text-red-900">
      {user.type === 'admin' ? (
        <AdminDashboard
          currentUser={user}
          onLogout={handleLogout}
          data={{ roles, users, taskDefs, assignments, routines }}
          actions={{ setRoles, setUsers, setTaskDefs, setAssignments, setRoutines }}
        />
      ) : (
        <UserDashboard
          currentUser={user}
          onLogout={handleLogout}
          data={{ assignments }}
          actions={{ setAssignments }}
        />
      )}
    </div>
  );
};

// --- Layout & Shared Components ---

const DashboardLayout = ({ sidebar, content, userName, onLogout, title }: any) => {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden dir-rtl gap-0">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-280px sidebar-premium shadow-2xl z-40">
        <div className="p-8 border-b border-white/5 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-rose-800 p-2.5 rounded-2xl shadow-lg shadow-red-500/30">
              <Briefcase className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-none">توصيل ون</h2>
              <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest mt-1">نظام إدارة المهام</p>
            </div>
          </div>
          <div className="mt-8 bg-white/5 p-3 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المستخدم الحالي</p>
            <p className="text-sm text-slate-200 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {userName}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
          <div className="px-4 mb-4">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">القائمة الرئيسية</p>
          </div>
          {sidebar}
        </div>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full p-4 rounded-2xl transition-all font-bold group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" /> تسجيل خروج
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#0f172a] text-white p-5 flex justify-between items-center shadow-xl z-50">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl">
              <Briefcase className="text-white" size={18} />
            </div>
            <span className="font-black text-lg">توصيل ون</span>
          </div>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl text-red-300 border border-red-500/20">
            <LogOut size={20} />
          </button>
        </div>

        {/* Mobile Nav Bar */}
        <div className="md:hidden bg-white border-b overflow-x-auto whitespace-nowrap px-4 py-3 flex gap-2 z-40 shadow-sm no-scrollbar">
          {React.Children.map(sidebar, child => (
            <div className="inline-block">
              {React.cloneElement(child, { mobile: true })}
            </div>
          ))}
        </div>

        {/* Page Content area */}
        <div className="flex-1 overflow-y-auto bg-white relative z-30">
          <div className="max-w-7xl mx-auto p-4 md:p-10 pb-20">
            {/* Header / Breadcrumb area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 animate-fade-in">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">{title}</h1>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-12 h-1.5 bg-red-600 rounded-full"></span>
                  <p className="text-slate-500 font-bold text-lg">نظرة عامة على العمل والنتائج</p>
                </div>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">تاريخ اليوم</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{getTodayDate()}</p>
                </div>
              </div>
            </div>

            <div className="animate-scale-in">
              {content}
            </div>
          </div>

          {/* Background Blobs for extra awesomeness */}
          <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        </div>
      </main>
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick, mobile }: any) => (
  <button
    onClick={onClick}
    className={`
      nav-item ${active ? 'active' : ''}
      ${mobile ? 'text-sm py-2 px-4 shadow-sm' : 'w-full mb-1'}
    `}
  >
    {React.cloneElement(icon, { size: mobile ? 18 : 22, className: active ? 'text-white' : 'text-slate-500' })}
    <span className="mt-0.5">{label}</span>
  </button>
);

const LoginPage = ({ onLogin }: { onLogin: (e: React.FormEvent, email: string, pass: string) => void }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1120] p-6 relative overflow-hidden dir-rtl">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-red-800/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-red-600 to-red-800 shadow-xl mb-6 shadow-red-900/20">
            <Briefcase size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 leading-tight">نظام إدارة المهام</h1>
          <h2 className="text-2xl font-black text-red-500 mb-4">شركة توصيل ون</h2>
          <p className="text-slate-400 text-base font-bold">سجل دخولك لتنظيم يومك وإنجاز مهامك</p>
        </div>

        <div className="bg-[#111827]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-2xl animate-scale-in">
          <form onSubmit={(e) => onLogin(e, email, pass)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">البريد الإلكتروني للإدارة</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  className="w-full login-input rounded-xl outline-none transition-all placeholder:text-white/5"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <div className="absolute inset-y-0 left-3.5 flex items-center text-white/20 group-focus-within:text-red-500 transition-colors">
                  <Users size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">كلمة المرور</label>
              <div className="relative group">
                <input
                  type="password"
                  required
                  className="w-full login-input rounded-xl outline-none transition-all placeholder:text-white/5"
                  placeholder="••••••••"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                />
                <div className="absolute inset-y-0 left-3.5 flex items-center text-white/20 group-focus-within:text-red-500 transition-colors">
                  <Shield size={18} />
                </div>
              </div>
            </div>

            <button type="submit" className="login-btn !py-3.5 !text-lg mt-2">
              دخول النظام
            </button>
          </form>
        </div>

        <div className="mt-8 text-center animate-fade-in delay-200">
          <p className="text-slate-600 text-xs font-bold">جميع الحقوق محفوظة © 2026 - توصيل ون</p>
        </div>
      </div>
    </div>
  );
};

// --- Admin Dashboard Components ---

const AdminDashboard = ({ currentUser, onLogout, data, actions }: any) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'assign' | 'audit' | 'reports'>('audit');

  const getTitle = () => {
    switch (activeTab) {
      case 'audit': return 'مراقبة المهام وسير العمل';
      case 'users': return 'إدارة الموظفين والأدوار';
      case 'tasks': return 'تعريف وهيكلة المهام';
      case 'assign': return 'إسناد وتوزيع المهام';
      case 'reports': return 'التقارير والإحصائيات';
      default: return 'لوحة التحكم';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return (
        <AdminUsers
          roles={data.roles}
          users={data.users}
          assignments={data.assignments}
          routines={data.routines}
          setRoles={actions.setRoles}
          setUsers={actions.setUsers}
          setRoutines={actions.setRoutines}
        />
      );
      case 'tasks': return (
        <AdminTaskDefs
          taskDefs={data.taskDefs}
          assignments={data.assignments}
          routines={data.routines}
          setTaskDefs={actions.setTaskDefs}
        />
      );
      case 'assign': return <AdminAssign taskDefs={data.taskDefs} users={data.users} roles={data.roles} setAssignments={actions.setAssignments} setRoutines={actions.setRoutines} />;
      case 'audit': return <AdminAudit assignments={data.assignments} users={data.users} setAssignments={actions.setAssignments} />;
      case 'reports': return <AdminReports assignments={data.assignments} users={data.users} />;
      default: return null;
    }
  };

  const sidebarItems = [
    <NavBtn key="audit" icon={<CheckSquare />} label="مراقبة المهام" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />,
    <NavBtn key="users" icon={<Users />} label="الموظفين والأدوار" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />,
    <NavBtn key="tasks" icon={<Briefcase />} label="تعريف المهام" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />,
    <NavBtn key="assign" icon={<Plus />} label="إسناد المهام" active={activeTab === 'assign'} onClick={() => setActiveTab('assign')} />,
    <NavBtn key="reports" icon={<BarChart2 />} label="التقارير" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
  ];

  return (
    <DashboardLayout
      sidebar={sidebarItems}
      content={renderContent()}
      userName={`مرحباً، ${currentUser.name}`}
      onLogout={onLogout}
      title={getTitle()}
    />
  );
};

// 1. Roles & Users Management
const AdminUsers = ({ roles, users, assignments, routines, setRoles, setUsers, setRoutines }: any) => {
  const [newRole, setNewRole] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', roleId: '', type: 'user' as UserType });

  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole.trim()) {
      const id = generateId();
      const { error } = await supabase.from('roles').insert([{ id, name: newRole }]);
      if (error) alert('خطأ في إضافة الدور: ' + error.message);
      else setNewRole('');
    }
  };

  const deleteRole = async (roleId: string) => {
    const roleInUse = users.some((u: User) => u.roleId === roleId);
    if (roleInUse) return alert('لا يمكن حذف هذا الدور لوجود موظفين مرتبطين به حالياً. قم بتغيير أدوارهم أولاً.');

    if (window.confirm('هل أنت متأكد من حذف هذا الدور؟')) {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) alert('خطأ في حذف الدور: ' + error.message);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.type === 'user' && !newUser.roleId) return alert('يجب اختيار الدور الوظيفي للموظف');

    const id = generateId();
    const { error } = await supabase.from('users').insert([{
      id,
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      type: newUser.type,
      role_id: newUser.roleId || null,
      disabled: false
    }]);

    if (error) alert('خطأ في إضافة الموظف: ' + error.message);
    else setNewUser({ name: '', email: '', password: '', roleId: '', type: 'user' as UserType });
  };

  const toggleUserStatus = async (userId: string) => {
    if (userId === 'admin-1') return alert('لا يمكن تعطيل حساب المدير العام الأساسي');
    const userToToggle = users.find((u: User) => u.id === userId);
    if (!userToToggle) return;

    const action = userToToggle.disabled ? 'تفعيل' : 'تعطيل';
    if (window.confirm(`هل أنت متأكد من ${action} هذا الحساب؟`)) {
      const { error } = await supabase.from('users').update({ disabled: !userToToggle.disabled }).eq('id', userId);

      if (error) {
        alert('خطأ في تحديث حالة الموظف: ' + error.message);
      } else if (!userToToggle.disabled) {
        // Deactivate routines as well
        await supabase.from('routines').update({ is_active: false }).eq('user_id', userId);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Roles Section */}
      <div className="premium-card">
        <div className="section-header-centered">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner mb-4">
            <Shield size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800">الأدوار الوظيفية</h3>
            <p className="text-sm font-bold text-slate-400">تحديد المسميات الوظيفية للموظفين</p>
          </div>
        </div>

        <form onSubmit={addRole} className="flex flex-col sm:flex-row gap-4 mb-10 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="مثال: مصمم، مبرمج..."
            className="flex-1 premium-input"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            required
          />
          <button className="btn-primary">إضافة</button>
        </form>

        <div className="flex flex-wrap gap-3">
          {roles.length === 0 && (
            <div className="w-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">لا توجد أدوار معرفة بعد</p>
            </div>
          )}
          {roles.map((r: Role) => (
            <div key={r.id} className="group relative">
              <span className="bg-white text-slate-700 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 hover:border-blue-200 hover:bg-blue-50/20 transition-all shadow-sm">
                <Shield size={14} className="text-blue-500" />
                {r.name}
                <button
                  onClick={() => deleteRole(r.id)}
                  className="absolute left-2 text-red-400 hover:text-red-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg"
                >
                  <XCircle size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Users Section */}
      <div className="premium-card">
        <div className="section-header-centered">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner mb-4">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800">إدارة الحسابات</h3>
            <p className="text-sm font-bold text-slate-400">إنشاء وتعديل بيانات الموظفين والوصول</p>
          </div>
        </div>

        <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">الاسم الكامل</label>
            <input
              type="text" placeholder="الاسم" className="w-full premium-input font-black" required
              value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">البريد الإلكتروني</label>
            <input
              type="email" placeholder="email@test.com" className="w-full premium-input font-mono text-sm" required
              value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">كلمة المرور</label>
            <input
              type="password" placeholder="••••••••" className="w-full premium-input font-black" required
              value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">نوع الحساب</label>
            <select
              className="w-full premium-input font-black" required
              value={newUser.type} onChange={e => setNewUser({ ...newUser, type: e.target.value as UserType })}
            >
              <option value="user">موظف (User)</option>
              <option value="admin">مدير (Admin)</option>
            </select>
          </div>
          {newUser.type === 'user' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">الدور الوظيفي</label>
              <select
                className="w-full premium-input font-black text-blue-600" required
                value={newUser.roleId} onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}
              >
                <option value="">اختر الدور الوظيفي...</option>
                {roles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-start-3 self-end">
            <button className="btn-primary w-full py-4 text-lg">إنشاء الحساب</button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm transition-all duration-300">
          <table className="w-full text-right bg-white">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">الموظف</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">رتبة الوصول</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">الدور</th>
                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100 text-center">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u: User) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.disabled ? 'opacity-50' : ''}`}>
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${u.disabled ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'} shadow-sm border border-white`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-none">{u.name}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${u.type === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                      {u.type === 'admin' ? 'إدارة عليا' : 'موظف تنفيذ'}
                    </span>
                  </td>
                  <td className="p-5">
                    {u.type === 'admin' ?
                      <span className="text-slate-400 text-xs font-bold italic">صلاحيات كاملة</span> :
                      <span className="bg-blue-50/50 px-4 py-1.5 rounded-2xl text-xs font-black text-blue-700 border border-blue-50">{roles.find((r: Role) => r.id === u.roleId)?.name || 'بدون مسمى'}</span>
                    }
                  </td>
                  <td className="p-5 text-center">
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`p-3 rounded-2xl transition-all shadow-sm border ${u.disabled
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 hover:shadow-amber-100'
                        }`}
                      title={u.disabled ? "تفعيل" : "تعطيل"}
                    >
                      {u.disabled ? <Unlock size={18} /> : <Lock size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. Task Definitions
const AdminTaskDefs = ({ taskDefs, assignments, routines, setTaskDefs }: any) => {
  const [mainTaskName, setMainTaskName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTaskName, setSubTaskName] = useState('');

  const addMainTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainTaskName.trim()) return;
    const id = generateId();
    const { error } = await supabase.from('task_definitions').insert([{
      id,
      name: mainTaskName,
      sub_tasks: []
    }]);

    if (error) alert('خطأ في إضافة المهمة: ' + error.message);
    else {
      setMainTaskName('');
      setExpandedId(id);
    }
  };

  const addSubTask = async (e: React.FormEvent, mainId: string) => {
    e.preventDefault();
    if (!subTaskName.trim()) return;

    const targetDef = taskDefs.find((t: TaskDefinition) => t.id === mainId);
    if (!targetDef) return;

    const newSubTask = { id: generateId(), name: subTaskName };
    const updatedSubTasks = [...targetDef.subTasks, newSubTask];

    const { error } = await supabase.from('task_definitions')
      .update({ sub_tasks: updatedSubTasks })
      .eq('id', mainId);

    if (error) alert('خطأ في إضافة البند الفرعي: ' + error.message);
    else setSubTaskName('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="premium-card">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
            <Plus size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">هيكلة المهام الجديدة</h3>
            <p className="text-sm text-slate-500">قم بتعريف المهام الكبرى والبنود الفرعية لها</p>
          </div>
        </div>

        <form onSubmit={addMainTask} className="flex gap-3">
          <input
            type="text"
            placeholder="مثال: تصميم إعلان جديد، مراجعة الحسابات..."
            className="flex-1 premium-input font-black"
            value={mainTaskName}
            onChange={e => setMainTaskName(e.target.value)}
            required
          />
          <button className="btn-primary py-4 px-10">
            إضافة المهمة
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {taskDefs.length === 0 && (
          <div className="text-center py-24 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-200 backdrop-blur-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
              <Briefcase size={36} className="text-slate-500" />
            </div>
            <p className="text-slate-400 font-black text-lg">لم يتم تعريف أي مهام رئيسية بعد</p>
          </div>
        )}

        {taskDefs.map((t: TaskDefinition) => (
          <div key={t.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:translate-y-[-2px] group">
            <div
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              className={`p-6 flex justify-between items-center cursor-pointer transition-all ${expandedId === t.id ? 'bg-blue-600' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${expandedId === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                  <Briefcase size={22} />
                </div>
                <div>
                  <h4 className={`font-black text-lg transition-colors ${expandedId === t.id ? 'text-white' : 'text-slate-800'}`}>{t.name}</h4>
                  <p className={`text-xs font-bold mt-1 transition-colors ${expandedId === t.id ? 'text-blue-100' : 'text-slate-400'}`}>{t.subTasks.length} بنود فرعية مسجلة</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const taskInUse = assignments.some((a: Assignment) => a.mainTaskName === t.name) ||
                      routines.some((r: RoutineDefinition) => r.mainTaskName === t.name);

                    if (taskInUse) return alert('لا يمكن حذف هذه المهمة لوجود سجلات إسناد مرتبطة بها. قم بحذف الإسنادات أولاً.');

                    if (window.confirm('هل أنت متأكد من حذف هذه المهمة الرئيسية وجميع مهامها الفرعية؟')) {
                      await supabase.from('task_definitions').delete().eq('id', t.id);
                    }
                  }}
                  className={`p-2.5 rounded-xl transition-all ${expandedId === t.id ? 'bg-white/10 text-white hover:bg-white/20' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                >
                  <XCircle size={20} />
                </button>
                <div className={`transition-all duration-300 ${expandedId === t.id ? 'rotate-180 text-white' : 'text-slate-300'}`}>
                  <Menu size={20} />
                </div>
              </div>
            </div>

            {expandedId === t.id && (
              <div className="p-8 bg-white border-t border-slate-50 animate-fade-in">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8">
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 pr-2">إضافة بند فرعي للمهمة</h5>
                  <form onSubmit={(e) => addSubTask(e, t.id)} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="اسم البند (مثلاً: التأكد من الشعار)"
                      className="flex-1 premium-input font-bold text-sm bg-white"
                      value={subTaskName}
                      onChange={e => setSubTaskName(e.target.value)}
                      required
                    />
                    <button className="bg-emerald-600 text-white px-8 py-3 rounded-2xl hover:bg-emerald-500 transition-all font-black text-sm shadow-xl shadow-emerald-600/10">
                      إضافة البند
                    </button>
                  </form>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {t.subTasks.map((st: any) => (
                    <div key={st.id} className="flex justify-between items-center p-4 bg-white rounded-2xl group border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                        <span className="text-slate-700 font-black text-sm">{st.name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm('هل أنت متأكد من حذف هذه المهمة الفرعية؟')) {
                            const updatedSubTasks = t.subTasks.filter((s: any) => s.id !== st.id);
                            await supabase.from('task_definitions')
                              .update({ sub_tasks: updatedSubTasks })
                              .eq('id', t.id);
                          }
                        }}
                        className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                  {t.subTasks.length === 0 && (
                    <div className="sm:col-span-2 py-6 text-center text-slate-400 font-bold italic text-sm">لا توجد بنود فرعية لهذه المهمة</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Assignment
const AdminAssign = ({ taskDefs, users, roles, setAssignments, setRoutines }: any) => {
  const [selectedTasks, setSelectedTasks] = useState<{ mainId: string, subId?: string }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isRoutine, setIsRoutine] = useState(false);
  const [expandedAssignTask, setExpandedAssignTask] = useState<string | null>(null);

  const filteredUsers = users.filter((u: User) => u.roleId === selectedRoleId && !u.disabled);

  const toggleTaskSelection = (mainId: string, subId?: string) => {
    const exists = selectedTasks.some(t => t.mainId === mainId && t.subId === subId);
    if (exists) {
      setSelectedTasks(selectedTasks.filter(t => !(t.mainId === mainId && t.subId === subId)));
    } else {
      setSelectedTasks([...selectedTasks, { mainId, subId }]);
    }
  };

  const handleAssign = async () => {
    if (selectedTasks.length === 0 || !selectedUserId) return alert('الرجاء اختيار مهمة وموظف');

    const assignedUser = users.find((u: User) => u.id === selectedUserId);
    if (!assignedUser) return;

    const newItems: any[] = [];

    selectedTasks.forEach(sel => {
      const mainTask = taskDefs.find((t: TaskDefinition) => t.id === sel.mainId);
      const subTask = sel.subId ? mainTask?.subTasks.find((s: any) => s.id === sel.subId) : null;

      const mainName = mainTask?.name || '';
      const subName = subTask?.name;

      if (isRoutine) {
        newItems.push({
          id: generateId(),
          user_id: selectedUserId,
          main_task_name: mainName,
          sub_task_name: subName,
          is_active: true
        });
      } else {
        newItems.push({
          id: generateId(),
          user_id: selectedUserId,
          main_task_name: mainName,
          sub_task_name: subName || null,
          date: getTodayDate(),
          is_routine: false,
          status: 'pending',
          submitted: false
        });
      }
    });

    const table = isRoutine ? 'routines' : 'assignments';
    const { error } = await supabase.from(table).insert(newItems);

    if (error) {
      alert('خطأ في الإسناد: ' + error.message);
    } else {
      alert('تم إسناد المهام بنجاح');
      setSelectedTasks([]);
      setSelectedUserId('');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="premium-card">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">إسناد مهام جديدة</h3>
            <p className="text-sm text-slate-500">بداية رحلة إنجاز جديدة لموظفيك</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Column 1: Task Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">01</div>
              <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">قائمة المهام المتاحة</h4>
            </div>

            <div className="border border-slate-100 rounded-[2rem] bg-slate-50/50 p-6 h-[450px] overflow-y-auto space-y-4 no-scrollbar">
              {taskDefs.map((t: TaskDefinition) => (
                <div key={t.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all group hover:border-blue-200">
                  <div
                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedAssignTask === t.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                    onClick={() => setExpandedAssignTask(expandedAssignTask === t.id ? null : t.id)}
                  >
                    <label className="flex items-center gap-4 font-black cursor-pointer text-slate-800 mb-0 flex-1" onClick={e => e.stopPropagation()}>
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTasks.some(sel => sel.mainId === t.id && !sel.subId)}
                          onChange={() => toggleTaskSelection(t.id)}
                          className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 transition-all checked:border-blue-600 checked:bg-blue-600"
                        />
                        <CheckCircle className="absolute h-6 w-6 text-white scale-0 transition-transform peer-checked:scale-75 pointer-events-none" />
                      </div>
                      <span className="text-sm">{t.name}</span>
                    </label>
                    {t.subTasks.length > 0 && (
                      <div className={`transition-all duration-300 ${expandedAssignTask === t.id ? 'rotate-180 text-blue-600' : 'text-slate-300'}`}>
                        <Menu size={18} />
                      </div>
                    )}
                  </div>

                  {expandedAssignTask === t.id && t.subTasks.length > 0 && (
                    <div className="p-5 bg-slate-50 border-t border-slate-100 grid md:grid-cols-2 gap-3 animate-fade-in">
                      {t.subTasks.map((st: any) => (
                        <label key={st.id} className="flex items-center gap-3 text-xs text-slate-600 cursor-pointer bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={selectedTasks.some(sel => sel.mainId === t.id && sel.subId === st.id)}
                            onChange={() => toggleTaskSelection(t.id, st.id)}
                            className="h-4 w-4 accent-blue-600 rounded"
                          />
                          <span className="font-bold">{st.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {taskDefs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                  <Briefcase size={40} className="mb-4" />
                  <p className="font-black">لا توجد مهام منشأة بعد</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: User Selection & options */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">02</div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">تحديد المنفذ</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pr-2">تصفية حسب الدور</label>
                  <select
                    className="w-full premium-input text-sm font-black"
                    value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}
                  >
                    <option value="">كل التخصصات</option>
                    {roles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pr-2">الموظف المسؤول</label>
                  <select
                    className="w-full premium-input text-sm font-black text-blue-600 border-blue-100"
                    value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  >
                    <option value="">اختر الموظف...</option>
                    {(selectedRoleId ? filteredUsers : users.filter((u: User) => u.type === 'user' && !u.disabled)).map((u: User) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">03</div>
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">خيارات الإسناد</h4>
              </div>

              <label className="flex items-start gap-4 cursor-pointer group bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 hover:border-purple-200 transition-all">
                <input
                  type="checkbox"
                  checked={isRoutine}
                  onChange={e => setIsRoutine(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-purple-600 rounded"
                />
                <div>
                  <span className="block font-black text-slate-800 text-sm">تكرار روتيني؟</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">سيتم إضافة هذه المهام تلقائياً كل صباح للموظف</span>
                </div>
              </label>
            </div>

            <div className="pt-4">
              <button
                onClick={handleAssign}
                disabled={selectedTasks.length === 0 || !selectedUserId}
                className="btn-primary w-full py-5 text-lg shadow-2xl disabled:opacity-30 disabled:grayscale"
              >
                تأكيد الإسناد ({selectedTasks.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Audit / Monitoring
const AdminAudit = ({ assignments, users, setAssignments }: any) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [deficiencyModal, setDeficiencyModal] = useState<{ open: boolean, taskId: string | null }>({ open: false, taskId: null });
  const [deficiencyReason, setDeficiencyReason] = useState('');

  const filteredAssignments = assignments.filter((a: Assignment) => {
    const matchUser = filterUser ? a.userId === filterUser : true;
    const matchDate = filterDate ? a.date === filterDate : true;
    return matchUser && matchDate;
  });

  const openDeficiencyModal = (taskId: string) => {
    setDeficiencyModal({ open: true, taskId });
    setDeficiencyReason('');
  };

  const confirmDeficiency = async () => {
    if (!deficiencyReason.trim()) return alert('يجب كتابة سبب القصور');
    const { error } = await supabase.from('assignments')
      .update({ status: 'deficient', admin_note: deficiencyReason })
      .eq('id', deficiencyModal.taskId);

    if (error) alert('خطأ في تسجيل القصور: ' + error.message);
    else setDeficiencyModal({ open: false, taskId: null });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="premium-card bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">سجل الرقابة اليومي</h3>
              <p className="text-sm text-slate-500">متابعة دقيقة لكل المهام المسندة وحالاتها</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pr-2">تاريخ العرض</label>
              <input
                type="date"
                value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="premium-input py-2 px-4 shadow-none bg-white border-transparent focus:border-blue-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pr-2">الموظف</label>
              <select
                value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className="premium-input py-2 px-4 shadow-none bg-white border-transparent focus:border-blue-200 min-w-[180px]"
              >
                <option value="">كل الموظفين</option>
                {users.filter((u: User) => u.type === 'user').map((u: User) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm transition-all duration-300">
          <table className="w-full text-right bg-white">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-5 font-black text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">الموظف</th>
                <th className="p-5 font-black text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">المهمة</th>
                <th className="p-5 font-black text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">الحالة</th>
                <th className="p-5 font-black text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100">التبرير/الملاحظات</th>
                <th className="p-5 font-black text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="opacity-20 flex flex-col items-center">
                      <History size={48} className="mb-4" />
                      <p className="font-black text-lg text-slate-400">لا توجد سجلات مطابقة للفلاتر المختارة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a: Assignment) => {
                  const userObj = users.find((u: User) => u.id === a.userId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{userObj?.name.charAt(0)}</div>
                          <span className="font-black text-slate-800 text-sm whitespace-nowrap">{userObj?.name || 'غير معروف'}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="font-black text-slate-800 text-sm leading-tight mb-1">{a.mainTaskName}</div>
                        {a.subTaskName && <div className="text-[10px] text-slate-400 font-bold">{a.subTaskName}</div>}
                        <div className="flex gap-2 mt-2">
                          {a.isRoutine && <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-lg border border-indigo-100/50">روتين</span>}
                          {a.isManual && <span className="text-[8px] font-black bg-amber-50 text-amber-500 px-2 py-0.5 rounded-lg border border-amber-100/50">يدوي</span>}
                        </div>
                      </td>
                      <td className="p-5"><StatusBadge status={a.status} /></td>
                      <td className="p-5 max-w-[200px]">
                        {a.userNote ? (
                          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-500 italic">"{a.userNote}"</div>
                        ) : <span className="text-slate-200 text-xs">---</span>}
                        {a.adminNote && (
                          <div className="mt-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100 text-[10px] font-black text-rose-600">رد المدير: {a.adminNote}</div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {a.status === 'done' && (
                            <button
                              onClick={() => openDeficiencyModal(a.id)}
                              className="bg-white border border-rose-100 text-rose-500 p-2.5 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow-rose-200"
                              title="تسجيل قصور"
                            >
                              <AlertTriangle size={18} />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm('هل أنت متأكد من حذف هذا الإسناد؟')) {
                                await supabase.from('assignments').delete().eq('id', a.id);
                              }
                            }}
                            className="bg-white border border-slate-100 text-slate-400 p-2.5 rounded-xl hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-all shadow-sm"
                            title="حذف السجل"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deficiency Modal - Upgraded */}
      {deficiencyModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-3xl animate-scale-in border border-white/20">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-[2rem] bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">اعتراض الإدارة</h3>
                <p className="text-sm text-slate-500 font-bold">تسجيل ملاحظات القصور وتعديل الحالة</p>
              </div>
            </div>

            <p className="mb-8 text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
              سيتم تغيير حالة المهمة إلى <span className="font-black text-rose-600">"تم مع ملاحظات"</span>. يرجى توضيح النقاط التي لم تكتمل بالشكل المطلوب ليتمكن الموظف من مراجعتها.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2 mb-2">توضيح القصور (إجباري)</label>
                <textarea
                  className="w-full premium-input h-32 py-4 resize-none bg-slate-50 border-slate-100 focus:bg-white focus:border-rose-500"
                  placeholder="اكتب تفاصيل القصور هنا..."
                  value={deficiencyReason}
                  onChange={e => setDeficiencyReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setDeficiencyModal({ open: false, taskId: null })} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl transition-all font-black hover:bg-slate-200">تجاهل</button>
              <button onClick={confirmDeficiency} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 font-black">حفظ الملاحظة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. Reports
// 5. Reports
const AdminReports = ({ assignments, users }: any) => {
  const [tab, setTab] = useState<'modifications' | 'performance'>('performance');
  const [perfDateFrom, setPerfDateFrom] = useState('');
  const [perfDateTo, setPerfDateTo] = useState('');

  const modificationData = assignments.filter((a: Assignment) => a.status === 'deficient');

  const performanceData = useMemo(() => {
    return users.filter((u: User) => u.type === 'user').map((u: User) => {
      const userTasks = assignments.filter((a: Assignment) => {
        const dateInRange = (!perfDateFrom || a.date >= perfDateFrom) && (!perfDateTo || a.date <= perfDateTo);
        return a.userId === u.id && dateInRange;
      });

      return {
        name: u.name,
        total: userTasks.length,
        done: userTasks.filter((a: Assignment) => a.status === 'done').length,
        pending: userTasks.filter((a: Assignment) => a.status === 'pending').length,
        deficient: userTasks.filter((a: Assignment) => a.status === 'deficient').length,
        rejected: userTasks.filter((a: Assignment) => a.status === 'rejected').length,
      };
    });
  }, [users, assignments, perfDateFrom, perfDateTo]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="segmented-tabs max-w-2xl mx-auto">
        <button
          className={`segmented-btn ${tab === 'performance' ? 'active' : ''}`}
          onClick={() => setTab('performance')}
        >
          <BarChart2 size={18} /> لوحة مراقبة الأداء
        </button>
        <button
          className={`segmented-btn ${tab === 'modifications' ? 'active variant-rose' : ''}`}
          onClick={() => setTab('modifications')}
        >
          <AlertTriangle size={18} /> تقرير القصور
        </button>
      </div>

      <div className="premium-card">
        {tab === 'performance' ? (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">تحليل إنتاجية الموظفين</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">عرض إحصائيات الإنجاز والتعثر لكل موظف</p>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                <div className="flex items-center gap-2 px-3">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">الفترة</span>
                </div>
                <input type="date" value={perfDateFrom} onChange={e => setPerfDateFrom(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-all" />
                <span className="text-slate-300 font-bold">←</span>
                <input type="date" value={perfDateTo} onChange={e => setPerfDateTo(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {performanceData.map((data: any) => (
                <div key={data.name} className="p-6 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:translate-y-[-5px] transition-all duration-500 group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-lg font-black text-blue-600 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors uppercase">{data.name.charAt(0)}</div>
                    <div className="font-black text-slate-800 text-lg leading-tight">{data.name}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase">إجمالي المهام</span>
                      <span className="font-black text-slate-800">{data.total}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase tracking-tighter mb-1">تم بنجاح</span>
                        <span className="text-xl font-black">{data.done}</span>
                      </div>
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase tracking-tighter mb-1">بالانتظار</span>
                        <span className="text-xl font-black">{data.pending}</span>
                      </div>
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase tracking-tighter mb-1">قصور</span>
                        <span className="text-xl font-black">{data.deficient}</span>
                      </div>
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl border border-slate-200 flex flex-col items-center opacity-50">
                        <span className="text-[9px] font-black uppercase tracking-tighter mb-1">مرفوض</span>
                        <span className="text-xl font-black">{data.rejected}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase">نسبة الإنجاز</span>
                      <span className="text-[10px] font-black text-emerald-600">{data.total > 0 ? Math.round((data.done / data.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        style={{ width: `${data.total > 0 ? (data.done / data.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 line-height-tight">تحليل أخطاء التنفيذ</h3>
                <p className="text-sm text-slate-500 mt-1">تتبع كافة المهام التي تم تسجيل ملاحظات قصور عليها</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full text-right bg-white">
                <thead>
                  <tr className="bg-rose-50/50 text-rose-950">
                    <th className="p-5 font-black text-[10px] uppercase tracking-widest border-b border-rose-100">الموظف المسؤول</th>
                    <th className="p-5 font-black text-[10px] uppercase tracking-widest border-b border-rose-100">المهمة المعنية</th>
                    <th className="p-5 font-black text-[10px] uppercase tracking-widest border-b border-rose-100">التاريخ</th>
                    <th className="p-5 font-black text-[10px] uppercase tracking-widest border-b border-rose-100">ملاحظة المدير المستلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {modificationData.length === 0 ? (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold italic">لا توجد سجلات قصور مسجلة حتى الآن</td></tr>
                  ) : modificationData.map((a: Assignment) => (
                    <tr key={a.id} className="hover:bg-rose-50/10 transition-colors">
                      <td className="p-5 font-black text-slate-800 text-sm">{users.find((u: User) => u.id === a.userId)?.name}</td>
                      <td className="p-5">
                        <div className="font-black text-slate-800 text-sm leading-tight">{a.mainTaskName}</div>
                        {a.subTaskName && <div className="text-[10px] text-slate-400 mt-1">{a.subTaskName}</div>}
                      </td>
                      <td className="p-5 text-sm text-slate-500 font-bold font-mono">{a.date}</td>
                      <td className="p-5 max-w-sm">
                        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 text-xs font-black leading-relaxed">
                          {a.adminNote}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// --- User Dashboard Components ---

const UserDashboard = ({ currentUser, onLogout, data, actions }: any) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');

  // Analytics for Current Month
  const currentMonthStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const tasksThisMonth = data.assignments.filter((a: Assignment) => {
      const taskDate = new Date(a.date);
      return a.userId === currentUser.id && taskDate.getMonth() === currentMonth;
    });

    return {
      completed: tasksThisMonth.filter((a: Assignment) => a.status === 'done').length,
      notCompleted: tasksThisMonth.filter((a: Assignment) => ['pending', 'rejected', 'deficient'].includes(a.status)).length
    };
  }, [data.assignments, currentUser.id]);

  const sidebarItems = [
    <div key="stats" className="bg-slate-800/50 p-4 rounded-xl mb-6 space-y-3 border border-slate-700/50 backdrop-blur-sm">
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400">
        <div className="text-[10px] uppercase tracking-wider mb-1 opacity-80">مهام منجزة (شهر)</div>
        <div className="text-2xl font-bold flex items-center justify-between">
          {currentMonthStats.completed} <CheckCircle size={20} />
        </div>
      </div>
      <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400">
        <div className="text-[10px] uppercase tracking-wider mb-1 opacity-80">تحتاج متابعة</div>
        <div className="text-2xl font-bold flex items-center justify-between">
          {currentMonthStats.notCompleted} <AlertTriangle size={20} />
        </div>
      </div>
    </div>,
    <NavBtn key="daily" icon={<LayoutDashboard />} label="مهام اليوم" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />,
    <NavBtn key="history" icon={<History />} label="سجل المهام" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
  ];

  const getTitle = () => activeTab === 'daily' ? 'لوحة المهام اليومية' : 'سجل الأرشيف';

  return (
    <DashboardLayout
      sidebar={sidebarItems}
      content={
        activeTab === 'daily' ? (
          <UserDailyTasks
            currentUser={currentUser}
            assignments={data.assignments}
            setAssignments={actions.setAssignments}
            today={getTodayDate()}
          />
        ) : (
          <UserHistory
            currentUser={currentUser}
            assignments={data.assignments}
          />
        )
      }
      userName={`الموظف: ${currentUser.name}`}
      onLogout={onLogout}
      title={getTitle()}
    />
  );
};

const UserDailyTasks = ({ currentUser, assignments, setAssignments, today }: any) => {
  const [rejectModal, setRejectModal] = useState<{ open: boolean, taskId: string | null }>({ open: false, taskId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [manualModal, setManualModal] = useState(false);
  const [manualDetails, setManualDetails] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const myTasks = assignments.filter((a: Assignment) => a.userId === currentUser.id && a.date === today);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Assignment[] } = {};
    myTasks.forEach((t: Assignment) => {
      if (!groups[t.mainTaskName]) groups[t.mainTaskName] = [];
      groups[t.mainTaskName].push(t);
    });
    return groups;
  }, [myTasks]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleDone = async (taskId: string) => {
    await supabase.from('assignments').update({ status: 'done' }).eq('id', taskId);
  };

  const handleRejectClick = (taskId: string) => {
    setRejectModal({ open: true, taskId });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return alert('سبب الرفض إلزامي');
    await supabase.from('assignments')
      .update({ status: 'rejected', user_note: rejectReason })
      .eq('id', rejectModal.taskId);
    setRejectModal({ open: false, taskId: null });
  };

  const submitTask = async (taskId: string) => {
    if (confirm('هل أنت متأكد؟ لن تتمكن من التعديل بعد الإرسال.')) {
      await supabase.from('assignments').update({ submitted: true }).eq('id', taskId);
    }
  };

  const addManualTask = async () => {
    if (!manualDetails.trim()) return alert('تفاصيل التصميم إلزامية');
    await supabase.from('assignments').insert([{
      id: generateId(),
      user_id: currentUser.id,
      main_task_name: 'تصميم عروض',
      sub_task_name: 'إضافة يدوية',
      date: today,
      is_routine: false,
      status: 'pending',
      submitted: false,
      is_manual: true,
      user_note: manualDetails
    }]);
    setManualModal(false);
    setManualDetails('');
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200">
            <Calendar size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">مرحباً، {currentUser.name.split(' ')[0]}</h3>
            <p className="text-sm text-slate-500 font-bold">لديك {myTasks.length} مهام مقررة لليوم</p>
          </div>
        </div>

        <button
          onClick={() => setManualModal(true)}
          className="btn-primary flex items-center gap-3 py-4 px-8 shadow-indigo-100"
        >
          <Plus size={20} className="bg-white/20 rounded-lg p-0.5" />
          إضافة تصميم عروض
        </button>
      </div>

      <div className="space-y-5">
        {myTasks.length === 0 ? (
          <div className="premium-card text-center py-24 bg-white/50 border-dashed border-2">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckSquare size={44} className="text-slate-200" />
            </div>
            <p className="text-xl font-black text-slate-900 mb-2">جدولك اليوم خالٍ من المهام بعد</p>
            <p className="text-sm text-slate-500">سيظهر لك إسناد جديد بمجرد إرسال الإدارة للمهام</p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([mainName, tasks]: [string, any[]]) => {
            const isExpanded = expandedGroups.includes(mainName);

            return (
              <div key={mainName} className={`premium-card p-0 overflow-hidden transition-all duration-500 ${isExpanded ? 'shadow-2xl border-blue-200' : 'hover:border-slate-300'}`}>
                <div
                  onClick={() => toggleGroup(mainName)}
                  className={`p-6 pr-8 flex justify-between items-center cursor-pointer transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isExpanded ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black tracking-tight ${isExpanded ? 'text-white' : 'text-slate-900'}`}>{mainName}</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isExpanded ? 'text-white/70' : 'text-slate-400'}`}>{tasks.length} مهام فرعية</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    {!isExpanded && (
                      <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                        {tasks.slice(0, 3).map((t, idx) => (
                          <div key={t.id} className={`w-3 h-3 rounded-full border-2 border-white ${t.status === 'done' ? 'bg-emerald-500' : t.status === 'rejected' ? 'bg-slate-400' : 'bg-amber-400'}`}></div>
                        ))}
                      </div>
                    )}
                    <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-8 space-y-8 animate-fade-in bg-white">
                    {tasks.map((task: Assignment) => (
                      <div key={task.id} className="relative group/item">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-black text-slate-800 text-base">{task.subTaskName || 'المهمة المطلوبة'}</h4>
                              <StatusBadge status={task.status} />
                              {task.isRoutine && <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-2 py-1 rounded-lg border border-purple-100">روتين</span>}
                            </div>

                            {task.isManual && (
                              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 text-xs font-bold text-amber-900 leading-relaxed italic">
                                "{task.userNote}"
                              </div>
                            )}

                            {task.status === 'deficient' && (
                              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl animate-pulse">
                                <div className="flex items-center gap-2 mb-1 text-rose-700 font-black text-xs uppercase tracking-widest">
                                  <AlertTriangle size={14} /> ملاحظة المدير
                                </div>
                                <p className="text-xs text-rose-600 font-bold leading-relaxed">{task.adminNote}</p>
                              </div>
                            )}
                          </div>

                          {!task.submitted ? (
                            <div className="flex flex-wrap items-center gap-3 md:pt-1">
                              <button
                                onClick={() => handleDone(task.id)}
                                className={`h-11 px-5 rounded-2xl flex items-center gap-2 text-sm font-black transition-all ${task.status === 'done' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-100'}`}
                              >
                                <CheckCircle size={18} /> إنجاز
                              </button>
                              <button
                                onClick={() => handleRejectClick(task.id)}
                                className={`h-11 px-5 rounded-2xl flex items-center gap-2 text-sm font-black transition-all ${task.status === 'rejected' ? 'bg-slate-600 text-white shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-100'}`}
                              >
                                <XCircle size={18} /> اعتذار
                              </button>
                              <div className="w-px h-8 bg-slate-100 mx-2 hidden md:block"></div>
                              <button
                                onClick={() => submitTask(task.id)}
                                disabled={task.status === 'pending' || task.status === 'deficient'}
                                className="h-11 bg-blue-600 text-white px-6 rounded-2xl text-xs font-black hover:bg-blue-700 disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-blue-600/20"
                              >
                                إرسال نهائي
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 text-slate-400 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                              <Shield size={16} className="opacity-50" />
                              تم الإرسال - المهمة مقفلة
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Task Modal - Upgraded */}
      {manualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-3xl animate-scale-in border border-white/20">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200">
                <Plus size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">إضافة مهمة تصميم</h3>
                <p className="text-sm text-slate-500 font-bold">إنشاء طلب تصميم عرض توضيحي جديد</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">تفاصيل العرض المطلوبة (إجباري)</label>
                <textarea
                  className="w-full premium-input h-40 py-5 resize-none bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-600"
                  placeholder="ما هو موضوع العرض؟ وكم عدد الشرائح المطلوبة؟"
                  value={manualDetails}
                  onChange={e => setManualDetails(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setManualModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.5rem] transition-all font-black hover:bg-slate-200">تجاهل</button>
              <button onClick={addManualTask} className="flex-[2] bg-indigo-600 text-white py-5 rounded-[1.5rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 font-black">حفظ المهمة</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal - Upgraded */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-3xl animate-scale-in border border-white/20">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-[2rem] bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-200">
                <XCircle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">اعتذار عن المهمة</h3>
                <p className="text-sm text-slate-500 font-bold">توضيح أسباب عدم القدرة على التنفيذ</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">سبب الاعتذار (إجباري)</label>
                <textarea
                  className="w-full premium-input h-40 py-5 resize-none bg-rose-50/30 border-rose-100 focus:bg-white focus:border-rose-600"
                  placeholder="لماذا لا يمكنك القيام بهذه المهمة؟"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setRejectModal({ open: false, taskId: null })} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.5rem] transition-all font-black hover:bg-slate-200">تجاهل</button>
              <button onClick={confirmReject} className="flex-[2] bg-rose-600 text-white py-5 rounded-[1.5rem] hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 font-black">تأكيد الاعتذار</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserHistory = ({ currentUser, assignments }: any) => {
  const [date, setDate] = useState('');

  const historyTasks = assignments.filter((a: Assignment) => {
    return a.userId === currentUser.id && (!date || a.date === date);
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="premium-card">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shadow-inner">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">أرشيف المهام</h3>
              <p className="text-xs text-slate-500 font-bold">مراجعة كافة سجلاتك السابقة</p>
            </div>
          </div>

          <div className="w-full md:w-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <Calendar size={18} />
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="premium-input pr-12 py-4 shadow-none bg-slate-50/50 hover:bg-white border-slate-100 w-full md:w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {historyTasks.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400">
            <Search size={44} className="mx-auto mb-4 opacity-10" />
            <p className="font-black text-lg">لم يتم العثور على سجلات</p>
            <p className="text-xs font-bold mt-1">جرب اختيار تاريخ مختلف أو استعرض كافة المهام</p>
          </div>
        ) : (
          historyTasks.map((task: Assignment) => (
            <div key={task.id} className="premium-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:translate-y-[-3px] hover:shadow-xl transition-all duration-500 group">
              <div className="flex items-center gap-5 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm group-hover:scale-110 transition-transform ${task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : task.status === 'rejected' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600'}`}>
                  {task.mainTaskName.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="font-black text-slate-800 text-base leading-tight">{task.mainTaskName}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Calendar size={12} /> {task.date}
                    </div>
                    {task.subTaskName && (
                      <div className="text-[10px] text-slate-400 font-black border-r border-slate-200 pr-4 mr-1">
                        {task.subTaskName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <StatusBadge status={task.status} />

                {task.adminNote && (
                  <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-bold border border-rose-100/50">
                    ملاحظة المدير: {task.adminNote}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Shared UI Components ---

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const configs: any = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500', label: 'قيد الانتظار' },
    done: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500', label: 'تم الإنجاز' },
    deficient: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500', label: 'تم مع ملاحظات' },
    rejected: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-500', label: 'رُفضت' }
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${config.bg} ${config.text} ${config.border} text-[10px] font-black tracking-tight`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} shadow-sm`}></span>
      {config.label}
    </span>
  );
};

// --- Entry Point ---

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
