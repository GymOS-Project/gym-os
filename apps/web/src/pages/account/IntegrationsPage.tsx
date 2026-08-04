import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { EMPTY_INTEGRATION_FORM } from "@/utils/constants";
import { Fingerprint, Plus } from "lucide-react";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const { gyms, selectedGymId } = useAuth();
  const [devices, setDevices] = useState<EsslDevice[]>([]);
  const [logs, setLogs] = useState<EsslRawPunchLog[]>([]);
  const [form, setForm] = useState({ ...EMPTY_INTEGRATION_FORM });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<EsslDevice | null>(null);

  const fetchData = async () => {
    try {
      const [deviceData, rawLogs] = await Promise.all([api.getEsslDevices(), api.getEsslRawLogs()]);
      setDevices(deviceData);
      setLogs(rawLogs);
    } catch (error: any) {
      toast.error(error.message || "Failed to load integration data");
    }
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      gym_id: current.gym_id || (selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || ""),
    }));
  }, [gyms, selectedGymId]);

  useEffect(() => {
    fetchData();
  }, [selectedGymId]);

  const openCreate = () => {
    setEditingDevice(null);
    setForm({ ...EMPTY_INTEGRATION_FORM, gym_id: selectedGymId !== "all" ? selectedGymId : gyms[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (device: EsslDevice) => {
    setEditingDevice(device);
    setForm({
      gym_id: device.gym_id,
      device_name: device.device_name,
      serial_number: device.serial_number || "",
      notes: device.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.gym_id || !form.device_name || !form.serial_number) {
      toast.error("Gym, device name, and serial number are required");
      return;
    }

    const payload = {
      gym_id: form.gym_id,
      device_name: form.device_name,
      serial_number: form.serial_number,
      integration_mode: editingDevice?.integration_mode || "adms",
      ip_address: editingDevice?.ip_address || null,
      port: editingDevice?.port || 4370,
      server_address: editingDevice?.server_address || null,
      server_port: editingDevice?.server_port || 80,
      status: editingDevice?.status || "inactive",
      notes: form.notes || null,
    };

    try {
      if (editingDevice) {
        await api.updateEsslDevice(editingDevice.id, payload);
        toast.success("Device updated");
      } else {
        await api.createEsslDevice(payload);
        toast.success("Device created");
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save device");
    }
  };

  const configuredBaseUrl = (((import.meta as any).env.VITE_API_BASE_URL || window.location.origin) as string).replace(/\/$/, "");
  const admsBaseUrl = configuredBaseUrl.replace(/\/api$/, "");
  const admsEndpoint = `${admsBaseUrl}/iclock/cdata`;
  let serverAddress = admsBaseUrl;
  let serverPort = "443";

  try {
    const parsed = new URL(admsBaseUrl);
    serverAddress = parsed.hostname;
    serverPort = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  } catch {
    serverAddress = admsBaseUrl;
  }

  return (
    <AppLayout title="Integrations">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">eSSL Integration</h1>
            <p className="mt-1 text-muted-foreground">Register attendance devices now, then point ADMS push or middleware sync into this app.</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Add Device</Button>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><Fingerprint className="h-4 w-4 text-primary" /><p className="font-medium">ADMS Device Target</p></div>
          <p className="text-sm text-muted-foreground">For ADMS devices, enter the server host and port below. The device will call the built-in ADMS route automatically.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Server Address</p>
              <p className="mt-1 font-mono break-all">{serverAddress}</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Server Port</p>
              <p className="mt-1 font-mono">{serverPort}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm font-mono break-all">{admsEndpoint}</div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Device</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No eSSL devices configured yet.</TableCell></TableRow>
              ) : devices.map((device) => (
                <TableRow key={device.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="font-medium">{device.device_name}</p>
                    <p className="text-xs text-muted-foreground">{device.serial_number || "No serial number"}</p>
                  </TableCell>
                  <TableCell>{device.integration_mode}</TableCell>
                  <TableCell>{device.ip_address ? `${device.ip_address}:${device.port || 4370}` : device.server_address || "Webhook only"}</TableCell>
                  <TableCell>{device.status}</TableCell>
                  <TableCell><div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => openEdit(device)}>Edit</Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Punch Time</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>User Code</TableHead>
                <TableHead>Processing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">No raw eSSL punch logs received yet.</TableCell></TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell>{log.punch_at ? new Date(log.punch_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{log.serial_number || "Unknown"}</TableCell>
                  <TableCell>{log.user_code || "-"}</TableCell>
                  <TableCell>{log.processing_status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingDevice ? "Edit eSSL Device" : "Add eSSL Device"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Gym *</Label><Select value={form.gym_id} onValueChange={(value) => setForm((current) => ({ ...current, gym_id: value }))}><SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger><SelectContent>{gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Device Name *</Label><Input value={form.device_name} onChange={(e) => setForm((current) => ({ ...current, device_name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Serial Number *</Label><Input value={form.serial_number} onChange={(e) => setForm((current) => ({ ...current, serial_number: e.target.value }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleSave}>{editingDevice ? "Update Device" : "Create Device"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
