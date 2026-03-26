import { useEffect, useState } from 'react';
import { Users, TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api.js';
import clsx from 'clsx';

const PLAN_COLORS = {
  free:    { bg: 'bg-white/10',      text: 'text-white/60',    label: 'Free' },
  beta:    { bg: 'bg-amber-500/15',  text: 'text-amber-400',   label: 'Beta' },
  pro:     { bg: 'bg-indigo-500/15', text: 'text-indigo-400',  label: 'Pro' },
  familia: { bg: 'bg-emerald-500/15',text: 'text-emerald-400', label: 'Familia' },
};

function StatCard({ icon: Icon, label, value, sub, delta, color = 'indigo' }) {
  const positive = delta > 0;
  return (
    <div className="bg-[#13131e] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-${color}-500/15 flex items-center justify-center`}>
          <Icon size={15} className={`text-${color}-400`} />
        </div>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      {sub && <p className="text-xs text-white/35">{sub}</p>}
      {delta !== undefined && (
        <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
          positive ? 'text-emerald-400' : 'text-rose-400')}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(delta)} vs mes anterior
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan, count }) {
  const c = PLAN_COLORS[plan] || PLAN_COLORS.free;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 ${c.bg}`}>
      <span className={`text-sm font-semibold ${c.text}`}>{c.label}</span>
      <span className="text-xl font-black text-white">{count}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const chartData = stats?.monthly_growth?.map(r => ({
    month: r.month.slice(5), // MM
    usuarios: Number(r.count),
  })) || [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Métricas de la aplicación en tiempo real</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors border border-white/8"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center h-64 text-white/30 text-sm">Cargando...</div>
      ) : stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Usuarios registrados"
              value={stats.users.total.toLocaleString()}
              sub={`${stats.users.new_this_month} nuevos este mes`}
              delta={stats.users.new_this_month - stats.users.new_last_month}
              color="indigo"
            />
            <StatCard
              icon={TrendingUp}
              label="Nuevos este mes"
              value={stats.users.new_this_month}
              sub={`${stats.users.new_last_month} el mes pasado`}
              delta={stats.users.new_this_month - stats.users.new_last_month}
              color="emerald"
            />
            <StatCard
              icon={Activity}
              label="Transacciones"
              value={stats.transactions.total.toLocaleString()}
              sub={`${stats.transactions.this_month} este mes`}
              delta={stats.transactions.this_month - stats.transactions.last_month}
              color="amber"
            />
            <StatCard
              icon={DollarSign}
              label="MRR estimado"
              value={`$${stats.mrr.toFixed(2)}`}
              sub={`${stats.users.plan_pro} Pro · ${stats.users.plan_familia} Familia`}
              color="violet"
            />
          </div>

          {/* Plan breakdown + growth chart */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Plan distribution */}
            <div className="bg-[#13131e] border border-white/8 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Distribución de planes</h2>
              <div className="grid grid-cols-2 gap-3">
                {(['free', 'beta', 'pro', 'familia']).map(plan => (
                  <PlanBadge key={plan} plan={plan} count={stats.users[`plan_${plan}`]} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/8">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Tasa de conversión a pago</span>
                  <span className="font-semibold text-white/70">
                    {stats.users.total > 0
                      ? (((stats.users.plan_pro + stats.users.plan_familia) / stats.users.total) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Growth chart */}
            <div className="bg-[#13131e] border border-white/8 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Nuevos usuarios (últimos 6 meses)</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                      itemStyle={{ color: '#818cf8' }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="usuarios" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-44 text-white/25 text-sm">Sin datos suficientes</div>
              )}
            </div>
          </div>

          {/* Recent users */}
          <div className="bg-[#13131e] border border-white/8 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Usuarios recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 border-b border-white/8">
                    <th className="text-left pb-3 pr-4 font-medium">Nombre</th>
                    <th className="text-left pb-3 pr-4 font-medium">Email</th>
                    <th className="text-left pb-3 pr-4 font-medium">Plan</th>
                    <th className="text-left pb-3 font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recent_users.map(u => {
                    const pc = PLAN_COLORS[u.plan] || PLAN_COLORS.free;
                    return (
                      <tr key={u.id} className="hover:bg-white/3 transition-colors">
                        <td className="py-3 pr-4 font-medium text-white/80">{u.name}</td>
                        <td className="py-3 pr-4 text-white/50">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${pc.bg} ${pc.text}`}>
                            {pc.label}
                          </span>
                        </td>
                        <td className="py-3 text-white/40 text-xs">
                          {new Date(u.created_at).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
