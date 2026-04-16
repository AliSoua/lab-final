// src/components/labs/createlabs/VMConfigStep.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    X,
    GripVertical,
    Server,
    Cpu,
    HardDrive,
    Network,
    Lock,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    VMTemplateFormData,
    VMOSType,
    GuacamoleConnectionType,
    GUACAMOLE_CONNECTION_LABELS,
    VM_OS_TYPE_LABELS,
    createEmptyVMTemplate,
} from '@/types/labs';

interface VMConfigStepProps {
    vms: VMTemplateFormData[];
    onChange: (vms: VMTemplateFormData[]) => void;
    errors?: any[];
}

export function VMConfigStep({ vms, onChange, errors }: VMConfigStepProps) {
    const [expandedVm, setExpandedVm] = useState<string | null>(null);

    const handleAddVM = () => {
        const newVm = createEmptyVMTemplate();
        onChange([...vms, newVm]);
        setExpandedVm(newVm.id);
    };

    const handleRemoveVM = (id: string) => {
        onChange(vms.filter(vm => vm.id !== id));
    };

    const handleUpdateVM = (id: string, updates: Partial<VMTemplateFormData>) => {
        onChange(vms.map(vm => vm.id === id ? { ...vm, ...updates } : vm));
    };

    const handleMoveVM = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= vms.length) return;

        const newVms = [...vms];
        [newVms[index], newVms[newIndex]] = [newVms[newIndex], newVms[index]];
        onChange(newVms);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Server className="h-4 w-4 text-slate-400" />
                        VM Templates
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Configure virtual machines for this lab (at least one required)
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVM}
                    className="border-slate-200 hover:bg-slate-50"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add VM
                </Button>
            </div>

            {vms.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-400">No VM templates configured</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Click "Add VM" to configure a virtual machine
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {vms.map((vm, index) => {
                    const isExpanded = expandedVm === vm.id;
                    const vmError = errors?.[index];

                    return (
                        <div
                            key={`vm-${index}`}
                            className={`border rounded-lg transition-colors ${isExpanded ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => setExpandedVm(isExpanded ? null : vm.id)}
                            >
                                <GripVertical className="h-4 w-4 text-slate-400 cursor-grab" />
                                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                                    <Server className="h-4 w-4 text-slate-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-slate-800">
                                            {vm.name || `VM ${index + 1}`}
                                        </span>
                                        <Badge variant="outline" className="text-[10px]">
                                            {VM_OS_TYPE_LABELS[vm.os_type]}
                                        </Badge>
                                        {vm.network_config.isolated_network && (
                                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                                <Lock className="h-3 w-3 mr-1" />
                                                Isolated
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {vm.cpu_cores} CPU • {vm.memory_mb} MB RAM • {vm.disk_gb} GB Disk
                                    </div>
                                    {vmError && Object.keys(vmError).length > 0 && (
                                        <div className="text-xs text-rose-500 mt-1">
                                            ⚠ Configuration errors
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={index === 0}
                                        onClick={(e) => { e.stopPropagation(); handleMoveVM(index, 'up'); }}
                                        className="h-7 w-7 p-0"
                                    >
                                        ↑
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={index === vms.length - 1}
                                        onClick={(e) => { e.stopPropagation(); handleMoveVM(index, 'down'); }}
                                        className="h-7 w-7 p-0"
                                    >
                                        ↓
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveVM(vm.id); }}
                                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-3 pb-3 space-y-4 border-t border-slate-100 pt-3">
                                    {/* Basic VM Info */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">VM Name</Label>
                                            <Input
                                                placeholder="Ubuntu Lab VM"
                                                value={vm.name}
                                                onChange={(e) => handleUpdateVM(vm.id, { name: e.target.value })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Proxmox VM ID</Label>
                                            <Input
                                                placeholder="9000"
                                                value={vm.id}
                                                onChange={(e) => handleUpdateVM(vm.id, { id: e.target.value })}
                                                className="h-9 bg-white border-slate-200 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Description</Label>
                                        <Input
                                            placeholder="Main lab environment"
                                            value={vm.description}
                                            onChange={(e) => handleUpdateVM(vm.id, { description: e.target.value })}
                                            className="h-9 bg-white border-slate-200"
                                        />
                                    </div>

                                    {/* OS Type */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">OS Type</Label>
                                            <Select
                                                value={vm.os_type}
                                                onValueChange={(value: VMOSType) => handleUpdateVM(vm.id, { os_type: value })}
                                            >
                                                <SelectTrigger className="h-9 bg-white border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(VM_OS_TYPE_LABELS).map(([type, label]) => (
                                                        <SelectItem key={type} value={type}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Distribution</Label>
                                            <Input
                                                placeholder="ubuntu-22.04"
                                                value={vm.os_distribution}
                                                onChange={(e) => handleUpdateVM(vm.id, { os_distribution: e.target.value })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Resources */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 flex items-center gap-1">
                                                <Cpu className="h-3 w-3" /> CPU Cores
                                            </Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={32}
                                                value={vm.cpu_cores}
                                                onChange={(e) => handleUpdateVM(vm.id, { cpu_cores: parseInt(e.target.value) || 1 })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Memory (MB)</Label>
                                            <Input
                                                type="number"
                                                min={512}
                                                step={512}
                                                value={vm.memory_mb}
                                                onChange={(e) => handleUpdateVM(vm.id, { memory_mb: parseInt(e.target.value) || 512 })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 flex items-center gap-1">
                                                <HardDrive className="h-3 w-3" /> Disk (GB)
                                            </Label>
                                            <Input
                                                type="number"
                                                min={5}
                                                value={vm.disk_gb}
                                                onChange={(e) => handleUpdateVM(vm.id, { disk_gb: parseInt(e.target.value) || 20 })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Network */}
                                    <div className="p-3 rounded-md border border-slate-200 bg-slate-50/50 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                            <Network className="h-3.5 w-3.5" />
                                            Network Configuration
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-600">Bridge</Label>
                                                <Input
                                                    value={vm.network_config.bridge}
                                                    onChange={(e) => handleUpdateVM(vm.id, {
                                                        network_config: { ...vm.network_config, bridge: e.target.value }
                                                    })}
                                                    className="h-9 bg-white border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-600">VLAN ID (optional)</Label>
                                                <Input
                                                    type="number"
                                                    value={vm.network_config.vlan_id || ''}
                                                    onChange={(e) => handleUpdateVM(vm.id, {
                                                        network_config: { ...vm.network_config, vlan_id: e.target.value ? parseInt(e.target.value) : undefined }
                                                    })}
                                                    className="h-9 bg-white border-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={vm.network_config.isolated_network}
                                                    onCheckedChange={(checked) => handleUpdateVM(vm.id, {
                                                        network_config: { ...vm.network_config, isolated_network: checked }
                                                    })}
                                                    id={`isolated-${vm.id}`}
                                                />
                                                <Label htmlFor={`isolated-${vm.id}`} className="text-xs text-slate-600 cursor-pointer">
                                                    Isolated Network
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={vm.network_config.internet_access}
                                                    onCheckedChange={(checked) => handleUpdateVM(vm.id, {
                                                        network_config: { ...vm.network_config, internet_access: checked }
                                                    })}
                                                    id={`internet-${vm.id}`}
                                                />
                                                <Label htmlFor={`internet-${vm.id}`} className="text-xs text-slate-600 cursor-pointer">
                                                    Internet Access
                                                </Label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guacamole Connection */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Connection Type</Label>
                                            <Select
                                                value={vm.guacamole_connection_type}
                                                onValueChange={(value: GuacamoleConnectionType) => handleUpdateVM(vm.id, { guacamole_connection_type: value })}
                                            >
                                                <SelectTrigger className="h-9 bg-white border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(GUACAMOLE_CONNECTION_LABELS).map(([type, label]) => (
                                                        <SelectItem key={type} value={type}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Port</Label>
                                            <Input
                                                type="number"
                                                value={vm.guacamole_port}
                                                onChange={(e) => handleUpdateVM(vm.id, { guacamole_port: parseInt(e.target.value) || 22 })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Username</Label>
                                            <Input
                                                value={vm.guacamole_username}
                                                onChange={(e) => handleUpdateVM(vm.id, { guacamole_username: e.target.value })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-600">Password Secret (Vault)</Label>
                                            <Input
                                                placeholder="optional"
                                                value={vm.guacamole_password_secret}
                                                onChange={(e) => handleUpdateVM(vm.id, { guacamole_password_secret: e.target.value })}
                                                className="h-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}