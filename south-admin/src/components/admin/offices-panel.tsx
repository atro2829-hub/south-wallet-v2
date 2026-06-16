'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Edit, Search, Loader2,
  Building2, Users, BarChart3, Phone,
  MessageCircle, Clock, Wallet, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Download, ChevronDown, ChevronUp,
  DollarSign, Calendar, Activity,
  Mail, MapPinned,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface Office {
  id?: string;
  name: string;
  address: string;
  governorate: string;
  phone: string;
  whatsapp: string;
  managerName: string;
  isActive: boolean;
  workingHours: string;
  location: { lat: number; lng: number };
  balance: number;
  maxDailyTransaction: number;
  commissionPercentage: number;
}

interface Agent {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  governorate: string;
  officeId: string;
  balance: number;
  maxDailyTransaction: number;
  commissionPercentage: number;
  isActive: boolean;
  joinedAt: string;
  totalTransactions: number;
  totalRevenue: number;
}

interface OfficeReport {
  officeId: string;
  officeName: string;
  totalDeposits: number;
  totalWithdrawals: number;
  commissionEarned: number;
  transactionCount: number;
}

interface AgentReport {
  agentId: string;
  agentName: string;
  officeName: string;
  totalDeposits: number;
  totalWithdrawals: number;
  commissionEarned: number;
  transactionCount: number;
}

// ─── Constants ───────────────────────────────────────────

const GOVERNORATES = [
  'عدن',
  'لحج',
  'أبين',
  'شبوة',
  'حضرموت',
  'المهرة',
  'الضالع',
  'سقطرى',
];

const DEFAULT_OFFICE: Office = {
  name: '',
  address: '',
  governorate: 'عدن',
  phone: '',
  whatsapp: '',
  managerName: '',
  isActive: true,
  workingHours: '8:00 ص - 4:00 م',
  location: { lat: 0, lng: 0 },
  balance: 0,
  maxDailyTransaction: 500000,
  commissionPercentage: 2,
};

const DEFAULT_AGENT: Agent = {
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  governorate: 'عدن',
  officeId: '',
  balance: 0,
  maxDailyTransaction: 200000,
  commissionPercentage: 1.5,
  isActive: true,
  joinedAt: '',
  totalTransactions: 0,
  totalRevenue: 0,
};

// ─── Helper: Generate mock report data ──────────────────

function generateOfficeReports(offices: Office[]): OfficeReport[] {
  return offices.map(office => ({
    officeId: office.id || '',
    officeName: office.name,
    totalDeposits: Math.floor(Math.random() * 2000000) + 200000,
    totalWithdrawals: Math.floor(Math.random() * 1500000) + 100000,
    commissionEarned: Math.floor(Math.random() * 100000) + 10000,
    transactionCount: Math.floor(Math.random() * 500) + 50,
  }));
}

function generateAgentReports(agents: Agent[], offices: Office[]): AgentReport[] {
  return agents.map(agent => {
    const office = offices.find(o => o.id === agent.officeId);
    return {
      agentId: agent.id || '',
      agentName: agent.name,
      officeName: office ? office.name : 'بدون مكتب',
      totalDeposits: Math.floor(Math.random() * 800000) + 50000,
      totalWithdrawals: Math.floor(Math.random() * 600000) + 30000,
      commissionEarned: Math.floor(Math.random() * 50000) + 5000,
      transactionCount: Math.floor(Math.random() * 300) + 20,
    };
  });
}

function generateDailyReportData(): { day: string; deposits: number; withdrawals: number }[] {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      deposits: Math.floor(Math.random() * 500000) + 50000,
      withdrawals: Math.floor(Math.random() * 400000) + 30000,
    });
  }
  return data;
}

// ─── Main Component ──────────────────────────────────────

export default function OfficesPanel() {
  const { showToast } = useAdminStore();

  // ── Data State ──
  const [offices, setOffices] = useState<Office[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI State ──
  const [activeTab, setActiveTab] = useState('offices');
  const [officeSearch, setOfficeSearch] = useState('');
  const [officeGovFilter, setOfficeGovFilter] = useState('all');
  const [agentSearch, setAgentSearch] = useState('');
  const [agentGovFilter, setAgentGovFilter] = useState('all');
  const [agentOfficeFilter, setAgentOfficeFilter] = useState('all');
  const [agentStatusFilter, setAgentStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [reportSeed, setReportSeed] = useState(() => Date.now());

  // ── Dialog State ──
  const [officeDialog, setOfficeDialog] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [agentDialog, setAgentDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // ── Report State ──
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // ── Office Form ──
  const [officeForm, setOfficeForm] = useState<Office>({ ...DEFAULT_OFFICE });

  // ── Agent Form ──
  const [agentForm, setAgentForm] = useState<Agent>({ ...DEFAULT_AGENT });

  // ── Firebase Listeners ──
  useEffect(() => {
    const officesRef = ref(database, 'adminSettings/offices');
    const unsub1 = onValue(officesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Office[] = [];
      Object.entries<Record<string, unknown>>(data).forEach(([id, val]) => {
        list.push({
          id,
          name: (val.name as string) || '',
          address: (val.address as string) || '',
          governorate: (val.governorate as string) || 'عدن',
          phone: (val.phone as string) || '',
          whatsapp: (val.whatsapp as string) || '',
          managerName: (val.managerName as string) || '',
          isActive: val.isActive !== false,
          workingHours: (val.workingHours as string) || '8:00 ص - 4:00 م',
          location: (val.location as { lat: number; lng: number }) || { lat: 0, lng: 0 },
          balance: (val.balance as number) || 0,
          maxDailyTransaction: (val.maxDailyTransaction as number) || 500000,
          commissionPercentage: (val.commissionPercentage as number) || 2,
        });
      });
      setOffices(list);
    });

    const agentsRef = ref(database, 'adminSettings/agents');
    const unsub2 = onValue(agentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Agent[] = [];
      Object.entries<Record<string, unknown>>(data).forEach(([id, val]) => {
        list.push({
          id,
          name: (val.name as string) || '',
          phone: (val.phone as string) || '',
          whatsapp: (val.whatsapp as string) || '',
          email: (val.email as string) || '',
          governorate: (val.governorate as string) || 'عدن',
          officeId: (val.officeId as string) || '',
          balance: (val.balance as number) || 0,
          maxDailyTransaction: (val.maxDailyTransaction as number) || 200000,
          commissionPercentage: (val.commissionPercentage as number) || 1.5,
          isActive: val.isActive !== false,
          joinedAt: (val.joinedAt as string) || '',
          totalTransactions: (val.totalTransactions as number) || 0,
          totalRevenue: (val.totalRevenue as number) || 0,
        });
      });
      setAgents(list);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // ── Stats ──
  const activeOffices = offices.filter(o => o.isActive).length;
  const activeAgents = agents.filter(a => a.isActive).length;
  const totalOfficeBalance = offices.reduce((sum, o) => sum + o.balance, 0);
  const totalAgentTransactions = agents.reduce((sum, a) => sum + a.totalTransactions, 0);

  // ── Report data ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const officeReports = useMemo(() => generateOfficeReports(offices), [offices, reportSeed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const agentReports = useMemo(() => generateAgentReports(agents, offices), [agents, offices, reportSeed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyReportData = useMemo(() => generateDailyReportData(), [reportSeed]);

  // ── Active offices for dropdown ──
  const activeOfficesList = offices.filter(o => o.isActive);

  // ── Filtering ──
  const filteredOffices = offices.filter((o) => {
    const matchSearch = !officeSearch || o.name.includes(officeSearch) || o.governorate.includes(officeSearch) || o.managerName.includes(officeSearch);
    const matchGov = officeGovFilter === 'all' || o.governorate === officeGovFilter;
    return matchSearch && matchGov;
  });

  const filteredAgents = agents.filter((a) => {
    const matchSearch = !agentSearch || a.name.includes(agentSearch) || a.phone.includes(agentSearch) || a.governorate.includes(agentSearch);
    const matchGov = agentGovFilter === 'all' || a.governorate === agentGovFilter;
    const matchOffice = agentOfficeFilter === 'all' || a.officeId === agentOfficeFilter;
    const matchStatus = agentStatusFilter === 'all' ||
      (agentStatusFilter === 'active' && a.isActive) ||
      (agentStatusFilter === 'inactive' && !a.isActive);
    return matchSearch && matchGov && matchOffice && matchStatus;
  });

  // ── Handlers: Offices ──
  const resetOfficeForm = () => {
    setOfficeForm({ ...DEFAULT_OFFICE });
    setEditingOffice(null);
  };

  const openOfficeDialog = (office?: Office) => {
    if (office) {
      setEditingOffice(office);
      setOfficeForm({
        ...office,
        location: office.location ? { ...office.location } : { lat: 0, lng: 0 },
      });
    } else {
      resetOfficeForm();
    }
    setOfficeDialog(true);
  };

  const handleSaveOffice = async () => {
    if (!officeForm.name || !officeForm.governorate) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { id: _id, ...officeData } = officeForm;
      if (editingOffice?.id) {
        await update(ref(database, `adminSettings/offices/${editingOffice.id}`), officeData);
        showToast('تم تحديث المكتب', 'success');
      } else {
        await push(ref(database, 'adminSettings/offices'), { ...officeData, joinedAt: new Date().toISOString() });
        showToast('تم إضافة المكتب', 'success');
      }
      setOfficeDialog(false);
      resetOfficeForm();
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffice = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/offices/${id}`));
      showToast('تم حذف المكتب', 'success');
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggleOffice = async (office: Office) => {
    try {
      await update(ref(database, `adminSettings/offices/${office.id}`), { isActive: !office.isActive });
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    }
  };

  // ── Handlers: Agents ──
  const resetAgentForm = () => {
    setAgentForm({ ...DEFAULT_AGENT });
    setEditingAgent(null);
  };

  const openAgentDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({ ...agent });
    } else {
      resetAgentForm();
    }
    setAgentDialog(true);
  };

  const handleSaveAgent = async () => {
    if (!agentForm.name || !agentForm.phone) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { id: _agentId, ...agentData } = agentForm;
      if (editingAgent?.id) {
        await update(ref(database, `adminSettings/agents/${editingAgent.id}`), agentData);
        showToast('تم تحديث الوكيل', 'success');
      } else {
        await push(ref(database, 'adminSettings/agents'), { ...agentData, joinedAt: new Date().toISOString(), totalTransactions: 0, totalRevenue: 0 });
        showToast('تم إضافة الوكيل', 'success');
      }
      setAgentDialog(false);
      resetAgentForm();
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/agents/${id}`));
      showToast('تم حذف الوكيل', 'success');
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      await update(ref(database, `adminSettings/agents/${agent.id}`), { isActive: !agent.isActive });
    } catch (_e) {
      showToast('حدث خطأ', 'error');
    }
  };

  // ── Export ──
  const handleExportData = () => {
    const data = {
      offices,
      agents,
      officeReports,
      agentReports,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offices-agents-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Get office name by id ──
  const getOfficeName = (officeId: string) => {
    const office = offices.find(o => o.id === officeId);
    return office ? office.name : 'بدون مكتب';
  };

  // ── Render: Stats Cards ──
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-purple-500/10">
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(activeOffices)}</p>
          <p className="text-[11px] text-muted-foreground">مكتب نشط</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-green-500/10">
            <Users className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(activeAgents)}</p>
          <p className="text-[11px] text-muted-foreground">وكيل نشط</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-orange-500/10">
            <Wallet className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(totalOfficeBalance)}</p>
          <p className="text-[11px] text-muted-foreground">رصيد المكاتب (ر.ي)</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-emerald-500/10">
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(totalAgentTransactions)}</p>
          <p className="text-[11px] text-muted-foreground">إجمالي معاملات الوكلاء</p>
        </div>
      </motion.div>
    </div>
  );

  // ── Render: Tab 1 - Offices ──
  const renderOfficesTab = () => (
    <div className="space-y-4">
      {/* Search + Filter + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو المحافظة أو المدير..."
            value={officeSearch}
            onChange={(e) => setOfficeSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={officeGovFilter} onValueChange={setOfficeGovFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="المحافظة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المحافظات</SelectItem>
            {GOVERNORATES.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => openOfficeDialog()} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 ml-1" />
          إضافة مكتب
        </Button>
      </div>

      {/* Offices List */}
      <div className="space-y-2 max-h-[calc(100vh-520px)] overflow-y-auto scrollbar-thin">
        {filteredOffices.map((office, i) => {
          const isExpanded = expandedOfficeId === office.id;
          return (
            <motion.div
              key={office.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="ios-card"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl shrink-0 bg-purple-500/10">
                      <Building2 className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{office.name}</p>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-500">
                          {office.governorate}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        المدير: {office.managerName || '—'} • الرصيد: {formatNumber(office.balance)} ر.ي
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setExpandedOfficeId(isExpanded ? null : office.id!)}
                      className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <Badge className={cn(
                      'text-[10px]',
                      office.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    )}>
                      {office.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <div
                      onClick={() => handleToggleOffice(office)}
                      className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px]', office.isActive && 'active')}
                    />
                    <button onClick={() => openOfficeDialog(office)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => office.id && handleDeleteOffice(office.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">العنوان</p>
                          <p className="text-xs font-medium text-foreground">{office.address || '—'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">الهاتف</p>
                          <p className="text-xs font-medium text-foreground" dir="ltr">{office.phone || '—'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">واتساب</p>
                          <p className="text-xs font-medium text-foreground" dir="ltr">{office.whatsapp || '—'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> ساعات العمل</p>
                          <p className="text-xs font-medium text-foreground">{office.workingHours || '—'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> العمولة</p>
                          <p className="text-xs font-medium text-foreground">{office.commissionPercentage}%</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> الحد اليومي</p>
                          <p className="text-xs font-medium text-foreground">{formatNumber(office.maxDailyTransaction)} ر.ي</p>
                        </div>
                        {office.location && (office.location.lat !== 0 || office.location.lng !== 0) && (
                          <div className="p-2 rounded-lg bg-purple-500/5 col-span-2 sm:col-span-3">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPinned className="w-3 h-3" /> الموقع</p>
                            <p className="text-xs font-medium text-foreground" dir="ltr">{office.location.lat}, {office.location.lng}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
        {filteredOffices.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد مكاتب</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف مكتب جديد لبدء إدارة المكاتب والوكلاء</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Tab 2 - Agents ──
  const renderAgentsTab = () => (
    <div className="space-y-4">
      {/* Search + Filters + Add */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو المحافظة..."
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button onClick={() => openAgentDialog()} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 ml-1" />
            إضافة وكيل
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={agentGovFilter} onValueChange={setAgentGovFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="المحافظة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المحافظات</SelectItem>
              {GOVERNORATES.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentOfficeFilter} onValueChange={setAgentOfficeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="المكتب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المكاتب</SelectItem>
              {activeOfficesList.map(o => (
                <SelectItem key={o.id} value={o.id!}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentStatusFilter} onValueChange={setAgentStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">معطل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agents List */}
      <div className="space-y-2 max-h-[calc(100vh-560px)] overflow-y-auto scrollbar-thin">
        {filteredAgents.map((agent, i) => {
          const isExpanded = expandedAgentId === agent.id;
          const officeName = getOfficeName(agent.officeId);
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="ios-card"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl shrink-0 bg-green-500/10">
                      <Users className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-500">
                          {agent.governorate}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        المكتب: {officeName} • الرصيد: {formatNumber(agent.balance)} ر.ي
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setExpandedAgentId(isExpanded ? null : agent.id!)}
                      className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <Badge className={cn(
                      'text-[10px]',
                      agent.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    )}>
                      {agent.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <div
                      onClick={() => handleToggleAgent(agent)}
                      className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px]', agent.isActive && 'active')}
                    />
                    <button onClick={() => openAgentDialog(agent)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => agent.id && handleDeleteAgent(agent.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border/50">
                        {/* Contact Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف</p>
                            <p className="text-xs font-medium text-foreground" dir="ltr">{agent.phone || '—'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" /> واتساب</p>
                            <p className="text-xs font-medium text-foreground" dir="ltr">{agent.whatsapp || '—'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> البريد</p>
                            <p className="text-xs font-medium text-foreground truncate" dir="ltr">{agent.email || '—'}</p>
                          </div>
                        </div>
                        {/* Performance Stats */}
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2">إحصائيات الأداء</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/5">
                            <p className="text-[10px] text-purple-500">إجمالي المعاملات</p>
                            <p className="text-xs font-bold text-foreground">{formatNumber(agent.totalTransactions)}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-green-500/5">
                            <p className="text-[10px] text-green-500">إجمالي الإيرادات</p>
                            <p className="text-xs font-bold text-foreground">{formatNumber(agent.totalRevenue)} ر.ي</p>
                          </div>
                          <div className="p-2 rounded-lg bg-orange-500/5">
                            <p className="text-[10px] text-orange-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> العمولة</p>
                            <p className="text-xs font-bold text-foreground">{agent.commissionPercentage}%</p>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-500/5">
                            <p className="text-[10px] text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> الحد اليومي</p>
                            <p className="text-xs font-bold text-foreground">{formatNumber(agent.maxDailyTransaction)} ر.ي</p>
                          </div>
                        </div>
                        {agent.joinedAt && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/30 inline-flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">تاريخ الانضمام:</span>
                            <span className="text-[10px] font-medium text-foreground">{new Date(agent.joinedAt).toLocaleDateString('ar-SA')}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا يوجد وكلاء</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف وكيل جديد لبدء إدارة الوكلاء</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Tab 3 - Reports ──
  const renderReportsTab = () => {
    const maxDailyValue = Math.max(...dailyReportData.map(d => d.deposits + d.withdrawals), 1);
    const totalDeposits = officeReports.reduce((sum, r) => sum + r.totalDeposits, 0);
    const totalWithdrawals = officeReports.reduce((sum, r) => sum + r.totalWithdrawals, 0);
    const totalCommission = officeReports.reduce((sum, r) => sum + r.commissionEarned, 0);
    const totalTransactions = officeReports.reduce((sum, r) => sum + r.transactionCount, 0);

    return (
      <div className="space-y-4">
        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  reportPeriod === p
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                    : 'ios-card text-muted-foreground'
                )}
              >
                {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mr-auto">
            <Input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">إلى</span>
            <Input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="w-36 text-xs"
            />
          </div>
          <button
            onClick={handleExportData}
            className="px-3 py-2 rounded-xl ios-card text-xs font-medium flex items-center gap-1.5 card-press"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير
          </button>
          <button
            onClick={() => setReportSeed(Date.now())}
            className="px-3 py-2 rounded-xl ios-card text-xs font-medium flex items-center gap-1.5 card-press"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-green-500/10">
                <ArrowDownCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalDeposits)}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي الإيداعات (ر.ي)</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-orange-500/10">
                <ArrowUpCircle className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalWithdrawals)}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي السحوبات (ر.ي)</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-purple-500/10">
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalCommission)}</p>
              <p className="text-[11px] text-muted-foreground">العمولات المحققة (ر.ي)</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-emerald-500/10">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalTransactions)}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي المعاملات</p>
            </div>
          </motion.div>
        </div>

        {/* Bar Chart */}
        <div className="ios-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">تحليل المعاملات (30 يوم)</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> إيداعات</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500" /> سحوبات</span>
            </div>
          </div>
          <div className="flex items-end gap-[3px] h-40 overflow-x-auto scrollbar-thin pb-5 relative">
            {/* Y axis labels */}
            <div className="absolute left-0 top-0 h-32 flex flex-col justify-between text-[8px] text-muted-foreground z-10">
              <span>{formatNumber(maxDailyValue)}</span>
              <span>{formatNumber(Math.floor(maxDailyValue / 2))}</span>
              <span>0</span>
            </div>
            <div className="flex items-end gap-[3px] h-32 mr-8 min-w-0 flex-1">
              {dailyReportData.map((d, idx) => (
                <div key={idx} className="flex-1 min-w-[8px] flex flex-col items-center gap-[1px] h-full justify-end group relative">
                  <div className="absolute -top-6 bg-foreground text-background text-[7px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {formatNumber(d.deposits + d.withdrawals)}
                  </div>
                  <div
                    className="w-full rounded-t-sm bg-green-500/80 transition-all hover:bg-green-500"
                    style={{ height: `${(d.deposits / maxDailyValue) * 100}%` }}
                  />
                  <div
                    className="w-full rounded-t-sm bg-orange-500/80 transition-all hover:bg-orange-500"
                    style={{ height: `${(d.withdrawals / maxDailyValue) * 100}%` }}
                  />
                  {idx % 5 === 0 && (
                    <span className="text-[7px] text-muted-foreground mt-1 whitespace-nowrap">{d.day}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Office Reports */}
        <div className="ios-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-500" />
            تقارير المكاتب
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {officeReports.map((report) => {
              const maxOfficeValue = Math.max(...officeReports.map(r => r.totalDeposits + r.totalWithdrawals), 1);
              const totalValue = report.totalDeposits + report.totalWithdrawals;
              const depositWidth = (report.totalDeposits / maxOfficeValue) * 100;
              const withdrawWidth = (report.totalWithdrawals / maxOfficeValue) * 100;

              return (
                <div key={report.officeId} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-foreground">{report.officeName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatNumber(report.transactionCount)} معاملة</p>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-green-500">إيداعات</span>
                        <span className="text-foreground">{formatNumber(report.totalDeposits)} ر.ي</span>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${depositWidth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-orange-500">سحوبات</span>
                        <span className="text-foreground">{formatNumber(report.totalWithdrawals)} ر.ي</span>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${withdrawWidth}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">العمولة المحققة</span>
                    <span className="text-xs font-bold text-purple-500">{formatNumber(report.commissionEarned)} ر.ي</span>
                  </div>
                </div>
              );
            })}
            {officeReports.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">لا توجد بيانات تقارير</p>
            )}
          </div>
        </div>

        {/* Agent Reports */}
        <div className="ios-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            تقارير الوكلاء
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {agentReports.map((report) => {
              const maxAgentValue = Math.max(...agentReports.map(r => r.totalDeposits + r.totalWithdrawals), 1);
              const depositWidth = (report.totalDeposits / maxAgentValue) * 100;
              const withdrawWidth = (report.totalWithdrawals / maxAgentValue) * 100;

              return (
                <div key={report.agentId} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{report.agentName}</p>
                      <p className="text-[10px] text-muted-foreground">{report.officeName}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatNumber(report.transactionCount)} معاملة</p>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-green-500">إيداعات</span>
                        <span className="text-foreground">{formatNumber(report.totalDeposits)} ر.ي</span>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${depositWidth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-orange-500">سحوبات</span>
                        <span className="text-foreground">{formatNumber(report.totalWithdrawals)} ر.ي</span>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${withdrawWidth}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">العمولة المحققة</span>
                    <span className="text-xs font-bold text-purple-500">{formatNumber(report.commissionEarned)} ر.ي</span>
                  </div>
                </div>
              );
            })}
            {agentReports.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">لا توجد بيانات تقارير</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Office Dialog ──
  const renderOfficeDialog = () => (
    <Dialog open={officeDialog} onOpenChange={(open) => { if (!open) { setOfficeDialog(false); resetOfficeForm(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOffice ? 'تعديل المكتب' : 'إضافة مكتب جديد'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>اسم المكتب *</Label>
            <Input
              value={officeForm.name}
              onChange={(e) => setOfficeForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="مثال: مكتب عدن الرئيسي"
            />
          </div>
          <div>
            <Label>العنوان</Label>
            <Input
              value={officeForm.address}
              onChange={(e) => setOfficeForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="العنوان التفصيلي"
            />
          </div>
          <div>
            <Label>المحافظة *</Label>
            <Select value={officeForm.governorate} onValueChange={(val) => setOfficeForm(prev => ({ ...prev, governorate: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المحافظة" />
              </SelectTrigger>
              <SelectContent>
                {GOVERNORATES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الهاتف</Label>
              <Input
                value={officeForm.phone}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+967..."
                dir="ltr"
              />
            </div>
            <div>
              <Label>واتساب</Label>
              <Input
                value={officeForm.whatsapp}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+967..."
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <Label>اسم المدير</Label>
            <Input
              value={officeForm.managerName}
              onChange={(e) => setOfficeForm(prev => ({ ...prev, managerName: e.target.value }))}
              placeholder="اسم مدير المكتب"
            />
          </div>
          <div>
            <Label>ساعات العمل</Label>
            <Input
              value={officeForm.workingHours}
              onChange={(e) => setOfficeForm(prev => ({ ...prev, workingHours: e.target.value }))}
              placeholder="8:00 ص - 4:00 م"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>خط العرض (Latitude)</Label>
              <Input
                type="number"
                value={officeForm.location.lat || ''}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, location: { ...prev.location, lat: parseFloat(e.target.value) || 0 } }))}
                placeholder="0.0"
                dir="ltr"
              />
            </div>
            <div>
              <Label>خط الطول (Longitude)</Label>
              <Input
                type="number"
                value={officeForm.location.lng || ''}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, location: { ...prev.location, lng: parseFloat(e.target.value) || 0 } }))}
                placeholder="0.0"
                dir="ltr"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>الرصيد (ر.ي)</Label>
              <Input
                type="number"
                value={officeForm.balance || ''}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <Label>الحد اليومي (ر.ي)</Label>
              <Input
                type="number"
                value={officeForm.maxDailyTransaction || ''}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, maxDailyTransaction: parseFloat(e.target.value) || 0 }))}
                placeholder="500000"
                dir="ltr"
              />
            </div>
            <div>
              <Label>نسبة العمولة %</Label>
              <Input
                type="number"
                step="0.1"
                value={officeForm.commissionPercentage || ''}
                onChange={(e) => setOfficeForm(prev => ({ ...prev, commissionPercentage: parseFloat(e.target.value) || 0 }))}
                placeholder="2"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div
              onClick={() => setOfficeForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={cn('ios-toggle shrink-0 !w-[46px] !h-[28px]', officeForm.isActive && 'active')}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{officeForm.isActive ? 'نشط' : 'معطل'}</p>
              <p className="text-[10px] text-muted-foreground">تفعيل أو تعطيل المكتب</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setOfficeDialog(false); resetOfficeForm(); }}>إلغاء</Button>
          <Button onClick={handleSaveOffice} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
            {editingOffice ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: Agent Dialog ──
  const renderAgentDialog = () => (
    <Dialog open={agentDialog} onOpenChange={(open) => { if (!open) { setAgentDialog(false); resetAgentForm(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAgent ? 'تعديل الوكيل' : 'إضافة وكيل جديد'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>اسم الوكيل *</Label>
            <Input
              value={agentForm.name}
              onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="اسم الوكيل الكامل"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الهاتف *</Label>
              <Input
                value={agentForm.phone}
                onChange={(e) => setAgentForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+967..."
                dir="ltr"
              />
            </div>
            <div>
              <Label>واتساب</Label>
              <Input
                value={agentForm.whatsapp}
                onChange={(e) => setAgentForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+967..."
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={agentForm.email}
              onChange={(e) => setAgentForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>
          <div>
            <Label>المحافظة</Label>
            <Select value={agentForm.governorate} onValueChange={(val) => setAgentForm(prev => ({ ...prev, governorate: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المحافظة" />
              </SelectTrigger>
              <SelectContent>
                {GOVERNORATES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المكتب التابع له</Label>
            <Select value={agentForm.officeId || 'none'} onValueChange={(val) => setAgentForm(prev => ({ ...prev, officeId: val === 'none' ? '' : val }))}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المكتب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون مكتب</SelectItem>
                {activeOfficesList.map(o => (
                  <SelectItem key={o.id} value={o.id!}>{o.name} ({o.governorate})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>الرصيد (ر.ي)</Label>
              <Input
                type="number"
                value={agentForm.balance || ''}
                onChange={(e) => setAgentForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <Label>الحد اليومي (ر.ي)</Label>
              <Input
                type="number"
                value={agentForm.maxDailyTransaction || ''}
                onChange={(e) => setAgentForm(prev => ({ ...prev, maxDailyTransaction: parseFloat(e.target.value) || 0 }))}
                placeholder="200000"
                dir="ltr"
              />
            </div>
            <div>
              <Label>نسبة العمولة %</Label>
              <Input
                type="number"
                step="0.1"
                value={agentForm.commissionPercentage || ''}
                onChange={(e) => setAgentForm(prev => ({ ...prev, commissionPercentage: parseFloat(e.target.value) || 0 }))}
                placeholder="1.5"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div
              onClick={() => setAgentForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={cn('ios-toggle shrink-0 !w-[46px] !h-[28px]', agentForm.isActive && 'active')}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{agentForm.isActive ? 'نشط' : 'معطل'}</p>
              <p className="text-[10px] text-muted-foreground">تفعيل أو تعطيل الوكيل</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAgentDialog(false); resetAgentForm(); }}>إلغاء</Button>
          <Button onClick={handleSaveAgent} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
            {editingAgent ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Main Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ios-large-title">المكاتب والوكلاء</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {formatNumber(offices.length)} مكتب • {formatNumber(agents.length)} وكيل
          </p>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="offices" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-4 h-4" />
            المكاتب
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1.5 text-xs">
            <Users className="w-4 h-4" />
            الوكلاء
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-4 h-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offices" className="mt-4">
          {renderOfficesTab()}
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          {renderAgentsTab()}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {renderReportsTab()}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {renderOfficeDialog()}
      {renderAgentDialog()}
    </div>
  );
}
