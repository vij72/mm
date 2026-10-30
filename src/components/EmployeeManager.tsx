import React, { useState } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Download,
  Filter,
  Check,
  X,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { AuthUser, Employee } from '../types/press';

interface EmployeeManagerProps {
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  onOpenAddModal: () => void;
  currentUser?: AuthUser | null;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  onUpdateEmployees,
  onOpenAddModal,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [editingEmpCode, setEditingEmpCode] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});

  const sections = [
    { id: 'all', label: 'All Employees', count: employees.length },
    { id: 'pressDay', label: 'Press Day', count: employees.filter((e) => e.section === 'pressDay').length },
    { id: 'pressNight', label: 'Press Night', count: employees.filter((e) => e.section === 'pressNight').length },
    { id: 'millDay', label: 'Mill Day', count: employees.filter((e) => e.section === 'millDay').length },
    { id: 'millNight', label: 'Mill Night', count: employees.filter((e) => e.section === 'millNight').length },
    { id: 'tkl', label: 'TKL Roster', count: employees.filter((e) => e.section === 'tkl').length },
    { id: 'tkp', label: 'TKP Roster', count: employees.filter((e) => e.section === 'tkp').length },
    { id: 'odisha', label: 'Odisha Contractor', count: employees.filter((e) => e.section === 'odisha').length },
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSection = selectedSection === 'all' || emp.section === selectedSection;
    const matchesSearch =
      !searchTerm ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.section && emp.section.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSection && matchesSearch;
  });

  const handleToggleActive = (code: string) => {
    const updated = employees.map((emp) =>
      emp.code === code ? { ...emp, isActive: emp.isActive === false ? true : false } : emp
    );
    onUpdateEmployees(updated);
  };

  const handleDelete = (code: string) => {
    if (window.confirm(`Are you sure you want to remove employee code ${code}?`)) {
      const updated = employees.filter((emp) => emp.code !== code);
      onUpdateEmployees(updated);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingEmpCode(emp.code);
    setEditFormData({ ...emp });
  };

  const cancelEdit = () => {
    setEditingEmpCode(null);
    setEditFormData({});
  };

  const saveEdit = (code: string) => {
    const updated = employees.map((emp) => {
      if (emp.code === code) {
        return {
          ...emp,
          ...editFormData,
        } as Employee;
      }
      return emp;
    });
    onUpdateEmployees(updated);
    setEditingEmpCode(null);
  };

  const exportRosterCsv = () => {
    const headers = ['Code', 'Name', 'Section', 'Gender', 'Role', 'Status', 'Phone', 'Notes'];
    const rows = employees.map((e) => [
      `"${e.code}"`,
      `"${e.name}"`,
      `"${e.section}"`,
      `"${e.gender || ''}"`,
      `"${e.defaultLabourType || ''}"`,
      e.isActive !== false ? 'Active' : 'Inactive',
      `"${e.phone || ''}"`,
      `"${e.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `factory_employees_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-[1880px] mx-auto p-4 space-y-4">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Factory Employee Directory & Roster Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage factory personnel across Press, Mill, TKL, TKP, and Contract workforces.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={exportRosterCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {currentUser?.role === 'ADMIN' ? (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add New Employee
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Supervisor View: Adding employees is restricted to Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Section Pill Buttons */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  selectedSection === sec.id
                    ? 'bg-purple-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{sec.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedSection === sec.id ? 'bg-purple-800 text-purple-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {sec.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-14">Code</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Section / Department</th>
                <th className="py-2.5 px-3 w-20">Gender</th>
                <th className="py-2.5 px-3">Default Role</th>
                <th className="py-2.5 px-3 w-24">Status</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No employees found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, empIdx) => {
                  const isEditing = editingEmpCode === emp.code;
                  const rowKey = `${emp.section || 'sec'}_${emp.code}_${empIdx}`;

                  if (isEditing) {
                    return (
                      <tr key={rowKey} className="bg-purple-50/50">
                        <td className="py-2 px-3 font-mono font-bold">{emp.code}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editFormData.name ?? emp.name}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full text-xs px-2 py-1 border rounded border-slate-300"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editFormData.section ?? emp.section}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, section: e.target.value }))
                            }
                            className="text-xs px-2 py-1 border rounded border-slate-300 bg-white"
                          >
                            <option value="pressDay">Press Day</option>
                            <option value="pressNight">Press Night</option>
                            <option value="millDay">Mill Day</option>
                            <option value="millNight">Mill Night</option>
                            <option value="tkl">TKL</option>
                            <option value="tkp">TKP</option>
                            <option value="odisha">Odisha</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editFormData.gender ?? emp.gender ?? 'M'}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                gender: e.target.value as 'M' | 'F',
                              }))
                            }
                            className="text-xs px-2 py-1 border rounded border-slate-300 bg-white"
                          >
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editFormData.defaultLabourType ?? emp.defaultLabourType ?? 'operator'}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                defaultLabourType: e.target.value as any,
                              }))
                            }
                            className="text-xs px-2 py-1 border rounded border-slate-300 bg-white"
                          >
                            <option value="operator">Operator</option>
                            <option value="helper">Helper</option>
                            <option value="labour">Labour</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs text-slate-500">
                            {emp.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editFormData.notes ?? emp.notes ?? ''}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            className="w-full text-xs px-2 py-1 border rounded border-slate-300"
                            placeholder="Notes..."
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEdit(emp.code)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={rowKey}
                      className={`hover:bg-slate-50 transition ${
                        emp.isActive === false ? 'opacity-50 bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{emp.code}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 border border-slate-200 font-medium">
                          {emp.section}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold text-xs ${
                            emp.gender === 'F' ? 'text-pink-600' : 'text-blue-600'
                          }`}
                        >
                          {emp.gender || (emp.name.toLowerCase().includes('mrs') ? 'F' : 'M')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {emp.defaultLabourType || 'General'}
                      </td>
                      <td className="py-2.5 px-3">
                        {emp.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <UserX className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                        {emp.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {currentUser?.role === 'ADMIN' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(emp)}
                              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                              title="Edit Employee"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(emp.code)}
                              className="p-1 text-slate-600 hover:text-purple-600 hover:bg-slate-100 rounded"
                              title={emp.isActive !== false ? 'Deactivate' : 'Activate'}
                            >
                              {emp.isActive !== false ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(emp.code)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
