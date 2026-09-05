import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { PlanContentEditor } from "@/components/plans/PlanContentEditor";
import { PlanContentPreviewDialog } from "@/components/plans/PlanContentPreviewDialog";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NO_REFERENCE_MEMBER_OPTION } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { buildPlanFormData, createPlanEditorValue, type PlanEditorValue } from "@/lib/planContent";
import { isDateAfter, todayDateValue } from "@/lib/date";
import { toast } from "sonner";
import { addDays, addMonths, format } from "date-fns";
import { ArrowLeft } from "lucide-react";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email"),
  phone: z.string().trim().min(1, "Phone is required"),
  gender: z.string(),
  date_of_birth: z.string().refine((value) => !value || !isDateAfter(value, todayDateValue()), "Date of birth cannot be in the future"),
  current_address: z.string(),
  permanent_address: z.string(),
  emergency_contact: z.string(),
  shift: z.string(),
  notes: z.string(),
  aadhar_card_no: z.string(),
  driving_license_no: z.string(),
  pan_card_no: z.string(),
  marital_status: z.string(),
  external_user_code: z.string(),
  create_device_user: z.boolean(),
  gym_id: z.string().min(1, "Gym selection is required"),
  reference_member_id: z.string(),
  package_type_id: z.string(),
  start_date: z.string(),
  coupon_id: z.string(),
  amount_paid: z.string(),
  payment_mode: z.string(),
});

export default function AddMemberPage() {
  const today = todayDateValue();
  const { admin, gyms, selectedGymId, hasSectionAccess } = useAuth();
  const navigate = useNavigate();
  const { id: memberId } = useParams();
  const isEditing = Boolean(memberId);
  const canManageDietPlans = hasSectionAccess("diet_plans");
  const canManageExercisePlans = hasSectionAccess("exercise_plans");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; gym_id: string }[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [dietAssignments, setDietAssignments] = useState<DietPlanAssignment[]>([]);
  const [exerciseAssignments, setExerciseAssignments] = useState<ExercisePlanAssignment[]>([]);
  const [selectedDietPlanId, setSelectedDietPlanId] = useState("");
  const [selectedExercisePlanId, setSelectedExercisePlanId] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [pendingAssignmentDelete, setPendingAssignmentDelete] = useState<{ type: "diet" | "exercise"; assignmentId: string } | null>(null);
  const [couponValidation, setCouponValidation] = useState<CouponValidationResult | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<{ title: string; value: DietPlan | ExercisePlan | null } | null>(null);
  const [planEditor, setPlanEditor] = useState<{
    open: boolean;
    type: "diet" | "exercise";
    assignmentId: string;
    name: string;
    description: string;
    tag: string;
    planContent: PlanEditorValue;
  }>({
    open: false,
    type: "diet",
    assignmentId: "",
    name: "",
    description: "",
    tag: "",
    planContent: createPlanEditorValue(),
  });

  const methods = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "",
      date_of_birth: "",
      current_address: "",
      permanent_address: "",
      emergency_contact: "",
      shift: "",
      notes: "",
      aadhar_card_no: "",
      driving_license_no: "",
      pan_card_no: "",
      marital_status: "",
      external_user_code: "",
      create_device_user: false,
      gym_id: "",
      reference_member_id: NO_REFERENCE_MEMBER_OPTION,
      package_type_id: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      coupon_id: "",
      amount_paid: "",
      payment_mode: "cash",
    },
  });
  const form = methods.watch();
  const errors = methods.formState.errors;

  useEffect(() => {
    if (!admin) return;
    if (!isEditing) {
      const nextGymId = selectedGymId !== "all" ? selectedGymId : form.gym_id || gyms[0]?.id || "";
      if (nextGymId && nextGymId !== form.gym_id) {
        methods.setValue("gym_id", nextGymId, { shouldDirty: false });
      }
    }
    if (!isEditing) {
      api.getPlans().then((data) => setPackages(data.filter((p) => p.is_active)));
    }
    api.getCoupons().then(setCoupons).catch(() => { });
    api.getShifts().then((data) => setShifts(data.filter((shift) => shift.is_active))).catch(() => { });
    if (canManageDietPlans) {
      api.getDietPlans().then(setDietPlans).catch(() => { });
    }
    if (canManageExercisePlans) {
      api.getExercisePlans().then(setExercisePlans).catch(() => { });
    }
    api.getActiveMembers().then((data) => {
      setMembers(isEditing ? data.filter((member) => member.id !== memberId) : data);
    });
  }, [admin, canManageDietPlans, canManageExercisePlans, form.gym_id, gyms, isEditing, memberId, methods, selectedGymId]);

  useEffect(() => {
    if (!admin || !memberId) return;

    setPageLoading(true);
    api.getMember(memberId)
      .then((member) => {
        methods.reset({
          name: member.name,
          email: member.email || "",
          phone: member.phone,
          gender: member.gender || "",
          date_of_birth: member.date_of_birth || "",
          current_address: member.current_address || member.address || "",
          permanent_address: member.permanent_address || "",
          emergency_contact: member.emergency_contact || "",
          shift: member.shift || "",
          notes: member.notes || "",
          aadhar_card_no: member.aadhar_card_no || "",
          driving_license_no: member.driving_license_no || "",
          pan_card_no: member.pan_card_no || "",
          marital_status: member.marital_status || "",
          external_user_code: member.external_user_code || "",
          create_device_user: false,
          gym_id: member.gym_id || "",
          reference_member_id: member.reference_member_id || NO_REFERENCE_MEMBER_OPTION,
          package_type_id: "",
          start_date: format(new Date(), "yyyy-MM-dd"),
          coupon_id: "",
          amount_paid: "",
          payment_mode: "cash",
        });
        setDietAssignments(member.diet_plan_assignments || []);
        setExerciseAssignments(member.exercise_plan_assignments || []);
      })
      .catch((err: any) => {
        toast.error(err.message || "Failed to load member");
        navigate("/members");
      })
      .finally(() => setPageLoading(false));
  }, [admin, memberId, methods, navigate]);

  const availablePackages = packages.filter((pkg) => !form.gym_id || pkg.gym_id === form.gym_id);
  const availableCoupons = coupons.filter((coupon) => !coupon.gym_id || !form.gym_id || coupon.gym_id === form.gym_id);
  const availableShifts = shifts.filter((shift) => !form.gym_id || shift.gym_id === form.gym_id);
  const availableDietPlans = dietPlans.filter((plan) => plan.is_active && (!form.gym_id || plan.gym_id === form.gym_id));
  const availableExercisePlans = exercisePlans.filter((plan) => plan.is_active && (!form.gym_id || plan.gym_id === form.gym_id));
  const selectedPkg = availablePackages.find((p) => p.id === form.package_type_id);
  const endDate = selectedPkg && form.start_date
    ? selectedPkg.duration_months
      ? format(addMonths(new Date(form.start_date), selectedPkg.duration_months), "yyyy-MM-dd")
      : selectedPkg.duration_days
        ? format(addDays(new Date(form.start_date), selectedPkg.duration_days), "yyyy-MM-dd")
        : ""
    : "";
  const payableAmount = couponValidation?.netAmount ?? (parseFloat(form.amount_paid) || 0);

  const set = <K extends keyof z.infer<typeof memberSchema>>(k: K, v: z.infer<typeof memberSchema>[K]) => methods.setValue(k, v as any, { shouldDirty: true, shouldValidate: true });

  useEffect(() => {
    if (!form.package_type_id || !form.gym_id || !form.coupon_id || !form.amount_paid) {
      setCouponValidation(null);
      return;
    }

    const amount = parseFloat(form.amount_paid);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCouponValidation(null);
      return;
    }

    setCouponValidating(true);
    api.validateCoupon({
      gym_id: form.gym_id,
      gross_amount: amount,
      coupon_id: form.coupon_id,
    })
      .then((result) => setCouponValidation(result))
      .catch(() => setCouponValidation(null))
      .finally(() => setCouponValidating(false));
  }, [form.amount_paid, form.coupon_id, form.gym_id, form.package_type_id]);

  const memberPayload = {
    name: form.name,
    email: form.email || null,
    phone: form.phone,
    gym_id: form.gym_id,
    gender: (form.gender as any) || null,
    date_of_birth: form.date_of_birth || null,
    address: form.current_address || null,
    current_address: form.current_address || null,
    permanent_address: form.permanent_address || null,
    emergency_contact: form.emergency_contact || null,
    aadhar_card_no: form.aadhar_card_no || null,
    driving_license_no: form.driving_license_no || null,
    pan_card_no: form.pan_card_no || null,
    marital_status: form.marital_status || null,
    external_user_code: form.external_user_code || null,
    create_device_user: form.create_device_user,
    shift: form.shift || null,
    notes: form.notes || null,
    reference_member_id:
      form.reference_member_id && form.reference_member_id !== NO_REFERENCE_MEMBER_OPTION
        ? form.reference_member_id
        : null,
  };

  const refreshMemberPlans = async () => {
    if (!memberId) return;
    const member = await api.getMember(memberId);
    setDietAssignments(member.diet_plan_assignments || []);
    setExerciseAssignments(member.exercise_plan_assignments || []);
  };

  const assignDietPlan = async () => {
    if (!memberId || !selectedDietPlanId) return;
    setAssignmentSaving(true);
    try {
      await api.assignDietPlanToMember(memberId, selectedDietPlanId);
      setSelectedDietPlanId("");
      await refreshMemberPlans();
      toast.success("Diet plan assigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign diet plan");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const assignExercisePlan = async () => {
    if (!memberId || !selectedExercisePlanId) return;
    setAssignmentSaving(true);
    try {
      await api.assignExercisePlanToMember(memberId, selectedExercisePlanId);
      setSelectedExercisePlanId("");
      await refreshMemberPlans();
      toast.success("Exercise plan assigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign exercise plan");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const openPlanEditor = (type: "diet" | "exercise", assignment: DietPlanAssignment | ExercisePlanAssignment) => {
    setPlanEditor({
      open: true,
      type,
      assignmentId: assignment.id,
      name: assignment.plan?.name || "",
      description: assignment.plan?.description || "",
      tag: assignment.plan?.tag || "",
      planContent: createPlanEditorValue(assignment.plan),
    });
  };

  const savePlanCustomization = async () => {
    if (!memberId || !planEditor.assignmentId || !planEditor.name) {
      toast.error("Plan name is required");
      return;
    }

    setAssignmentSaving(true);
    try {
      const payload = buildPlanFormData(
        {
          name: planEditor.name,
          description: planEditor.description || null,
          tag: planEditor.tag || null,
        },
        planEditor.planContent,
      );

      if (planEditor.type === "diet") {
        await api.updateAssignedDietPlan(memberId, planEditor.assignmentId, payload);
      } else {
        await api.updateAssignedExercisePlan(memberId, planEditor.assignmentId, payload);
      }

      await refreshMemberPlans();
      setPlanEditor((current) => ({ ...current, open: false }));
      toast.success(`${planEditor.type === "diet" ? "Diet" : "Exercise"} plan customized`);
    } catch (err: any) {
      toast.error(err.message || "Failed to customize plan");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const removeAssignedPlan = async (type: "diet" | "exercise", assignmentId: string) => {
    if (!memberId) return;
    setAssignmentSaving(true);
    try {
      if (type === "diet") {
        await api.deleteAssignedDietPlan(memberId, assignmentId);
      } else {
        await api.deleteAssignedExercisePlan(memberId, assignmentId);
      }
      await refreshMemberPlans();
      toast.success(`${type === "diet" ? "Diet" : "Exercise"} plan removed`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove assigned plan");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const confirmRemoveAssignedPlan = async () => {
    if (!pendingAssignmentDelete) return;
    await removeAssignedPlan(pendingAssignmentDelete.type, pendingAssignmentDelete.assignmentId);
    setPendingAssignmentDelete(null);
  };

  const handleSubmit = async (values: z.infer<typeof memberSchema>) => {
    if (!admin) return;
    setLoading(true);
    try {
      if (isEditing && memberId) {
        await api.updateMember(memberId, memberPayload);
        toast.success("Member updated successfully!");
      } else {
        const member = await api.createMember(memberPayload);

        const amountPaid = parseFloat(values.amount_paid);
        if (values.package_type_id && endDate && Number.isFinite(amountPaid) && amountPaid > 0) {
          await api.createMemberSale({
            gym_id: values.gym_id,
            member_id: member.id,
            package_type_id: values.package_type_id,
            start_date: values.start_date,
            end_date: endDate,
            gross_amount: amountPaid,
            payment_mode: values.payment_mode,
            coupon_id: values.coupon_id || null,
            description: `Package: ${selectedPkg!.name}`,
          });
        }

        if ((member as Member & { device_sync_warning?: string }).device_sync_warning) {
          toast.warning((member as Member & { device_sync_warning: string }).device_sync_warning);
        } else {
          toast.success(form.create_device_user ? "Member added and device sync queued!" : "Member added successfully!");
        }
      }

      navigate("/members");
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEditing ? "update" : "add"} member`);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <AppLayout title={isEditing ? "Edit Member" : "Add Member"}>
        <div className="flex min-h-[320px] items-center justify-center"><LoadingSpinner /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? "Edit Member" : "Add Member"}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2 mb-4 -ml-2" onClick={() => navigate("/members")}>
            <ArrowLeft className="h-4 w-4" /> Back to Members
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Member" : "Add New Member"}</h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Update the member details below" : "Fill in the details to register a new member"}
          </p>
        </div>

        <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-base border-b pb-3">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gyms.length > 1 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gym *</Label>
                  <Select value={form.gym_id} onValueChange={(v) => set("gym_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gym" /></SelectTrigger>
                    <SelectContent>
                      {gyms.map((gym) => <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.gym_id ? <p className="text-sm font-medium text-destructive">{errors.gym_id.message}</p> : null}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Member name" />
                {errors.name ? <p className="text-sm font-medium text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9876543210" />
                {errors.phone ? <p className="text-sm font-medium text-destructive">{errors.phone.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Attendance / Device Code</Label>
                <Input value={form.external_user_code} onChange={(e) => set("external_user_code", e.target.value)} placeholder="Optional eSSL user code" />
              </div>
              {!isEditing ? (
                <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                  <Checkbox
                    id="create_device_user"
                    checked={form.create_device_user}
                    onCheckedChange={(checked) => set("create_device_user", Boolean(checked))}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="create_device_user" className="cursor-pointer">Create user on eSSL device</Label>
                    <p className="text-xs text-muted-foreground">
                      Queues this member for all active eSSL devices in the selected gym. If the device code is empty, GymOS assigns the next numeric code automatically.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="member@email.com" />
                {errors.email ? <p className="text-sm font-medium text-destructive">{errors.email.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <DatePicker value={form.date_of_birth} onChange={(value) => set("date_of_birth", value)} placeholder="Select date of birth" maxDate={today} />
                {errors.date_of_birth ? <p className="text-sm font-medium text-destructive">{errors.date_of_birth.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={(v) => set("shift", v)}>
                  <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    {availableShifts.length === 0 ? (
                      <SelectItem value="__no_shifts__" disabled>No shifts. Add from Packages and Shift &gt; Shifts.</SelectItem>
                    ) : (
                      availableShifts.map((shift) => <SelectItem key={shift.id} value={shift.name}>{shift.name}</SelectItem>)
                    )}
                    {form.shift && !availableShifts.some((shift) => shift.name === form.shift) ? (
                      <SelectItem value={form.shift}>{form.shift}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marital Status</Label>
                <Select value={form.marital_status} onValueChange={(v) => set("marital_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select marital status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Current Address</Label>
                <Textarea value={form.current_address} onChange={(e) => set("current_address", e.target.value)} placeholder="Current address" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Permanent Address</Label>
                <Textarea value={form.permanent_address} onChange={(e) => set("permanent_address", e.target.value)} placeholder="Permanent address" />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact</Label>
                <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="Emergency phone" />
              </div>
              <div className="space-y-1.5">
                <Label>Reference Member</Label>
                <Select value={form.reference_member_id} onValueChange={(v) => set("reference_member_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_REFERENCE_MEMBER_OPTION}>None</SelectItem>
                    {members.filter((m) => !form.gym_id || m.gym_id === form.gym_id).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Aadhar Card No</Label>
                <Input value={form.aadhar_card_no} onChange={(e) => set("aadhar_card_no", e.target.value)} placeholder="Aadhar number" />
              </div>
              <div className="space-y-1.5">
                <Label>Driving License No</Label>
                <Input value={form.driving_license_no} onChange={(e) => set("driving_license_no", e.target.value)} placeholder="Driving license number" />
              </div>
              <div className="space-y-1.5">
                <Label>PAN Card No</Label>
                <Input value={form.pan_card_no} onChange={(e) => set("pan_card_no", e.target.value)} placeholder="PAN number" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes" />
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-base border-b pb-3">Subscription Package</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Package Type</Label>
                  <Select value={form.package_type_id} onValueChange={(v) => set("package_type_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    <SelectContent>
                      {availablePackages.length === 0
                        ? <SelectItem value="__no_packages__" disabled>No packages. Add from Packages and Shift &gt; Package Types.</SelectItem>
                        : availablePackages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.price}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <DatePicker value={form.start_date} onChange={(value) => set("start_date", value)} placeholder="Select start date" allowClear={false} />
                </div>
                {endDate && (
                  <div className="space-y-1.5">
                    <Label>End Date (auto)</Label>
                    <Input value={endDate} disabled className="bg-muted" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Amount Paid (₹)</Label>
                  <Input type="number" value={form.amount_paid} onChange={(e) => set("amount_paid", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Coupon</Label>
                  <Select value={form.coupon_id} onValueChange={(v) => set("coupon_id", v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select coupon (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Coupon</SelectItem>
                      {availableCoupons.map((coupon) => <SelectItem key={coupon.id} value={coupon.id}>{coupon.code} - {coupon.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select value={form.payment_mode} onValueChange={(v) => set("payment_mode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(form.amount_paid || form.coupon_id) && (
                  <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross Amount</p>
                        <p className="mt-1 font-semibold">₹{(parseFloat(form.amount_paid) || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Discount</p>
                        <p className="mt-1 font-semibold text-success">₹{(couponValidation?.discountAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Final Payable</p>
                        <p className="mt-1 font-semibold text-primary">₹{payableAmount.toLocaleString()}</p>
                      </div>
                    </div>
                    {form.coupon_id && !couponValidation && !couponValidating ? (
                      <p className="mt-3 text-xs text-muted-foreground">Coupon will be revalidated while creating the payment.</p>
                    ) : null}
                    {couponValidating ? <p className="mt-3 text-xs text-muted-foreground">Validating coupon...</p> : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {isEditing && canManageDietPlans && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h2 className="font-semibold text-base">Assigned Diet Plans</h2>
                  <p className="text-sm text-muted-foreground">Assign shared diet templates or customize them for this member.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedDietPlanId} onValueChange={setSelectedDietPlanId}>
                    <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Select diet plan" /></SelectTrigger>
                    <SelectContent>
                      {availableDietPlans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={assignDietPlan} disabled={!selectedDietPlanId || assignmentSaving}>Assign</Button>
                </div>
              </div>

              <div className="space-y-3">
                {dietAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diet plans assigned yet.</p>
                ) : dietAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{assignment.plan?.name || 'Untitled plan'}</p>
                          <Badge variant={assignment.plan?.plan_scope === 'member_custom' ? 'default' : 'secondary'}>
                            {assignment.plan?.plan_scope === 'member_custom' ? 'Custom Copy' : 'Shared Template'}
                          </Badge>
                          <Badge variant="outline">{assignment.plan?.content_type === 'pdf' ? 'PDF' : 'Rich Text'}</Badge>
                          {assignment.plan?.tag && <Badge variant="outline">{assignment.plan.tag}</Badge>}
                        </div>
                        {assignment.plan?.description && <p className="mt-1 text-sm text-muted-foreground">{assignment.plan.description}</p>}
                        {assignment.plan?.pdf_file_name && <p className="mt-2 text-xs text-muted-foreground">{assignment.plan.pdf_file_name}</p>}
                      </div>
                      <div className="flex gap-2">
                        {assignment.plan && (
                          <Button type="button" variant="outline" onClick={() => setPreviewPlan({ title: assignment.plan?.name || 'Diet plan preview', value: assignment.plan || null })}>
                            Preview
                          </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => openPlanEditor('diet', assignment)} disabled={assignmentSaving}>
                          {assignment.plan?.plan_scope === 'member_custom' ? 'Edit Copy' : 'Customize'}
                        </Button>
                        <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setPendingAssignmentDelete({ type: 'diet', assignmentId: assignment.id })} disabled={assignmentSaving}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditing && canManageExercisePlans && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h2 className="font-semibold text-base">Assigned Exercise Plans</h2>
                  <p className="text-sm text-muted-foreground">Assign shared exercise templates or customize them for this member.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedExercisePlanId} onValueChange={setSelectedExercisePlanId}>
                    <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Select exercise plan" /></SelectTrigger>
                    <SelectContent>
                      {availableExercisePlans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={assignExercisePlan} disabled={!selectedExercisePlanId || assignmentSaving}>Assign</Button>
                </div>
              </div>

              <div className="space-y-3">
                {exerciseAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exercise plans assigned yet.</p>
                ) : exerciseAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{assignment.plan?.name || 'Untitled plan'}</p>
                          <Badge variant={assignment.plan?.plan_scope === 'member_custom' ? 'default' : 'secondary'}>
                            {assignment.plan?.plan_scope === 'member_custom' ? 'Custom Copy' : 'Shared Template'}
                          </Badge>
                          <Badge variant="outline">{assignment.plan?.content_type === 'pdf' ? 'PDF' : 'Rich Text'}</Badge>
                          {assignment.plan?.tag && <Badge variant="outline">{assignment.plan.tag}</Badge>}
                        </div>
                        {assignment.plan?.description && <p className="mt-1 text-sm text-muted-foreground">{assignment.plan.description}</p>}
                        {assignment.plan?.pdf_file_name && <p className="mt-2 text-xs text-muted-foreground">{assignment.plan.pdf_file_name}</p>}
                      </div>
                      <div className="flex gap-2">
                        {assignment.plan && (
                          <Button type="button" variant="outline" onClick={() => setPreviewPlan({ title: assignment.plan?.name || 'Exercise plan preview', value: assignment.plan || null })}>
                            Preview
                          </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => openPlanEditor('exercise', assignment)} disabled={assignmentSaving}>
                          {assignment.plan?.plan_scope === 'member_custom' ? 'Edit Copy' : 'Customize'}
                        </Button>
                        <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setPendingAssignmentDelete({ type: 'exercise', assignmentId: assignment.id })} disabled={assignmentSaving}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/members")}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? (isEditing ? "Updating..." : "Adding...") : isEditing ? "Update Member" : "Add Member"}
            </Button>
          </div>
        </form>

        <Dialog open={planEditor.open} onOpenChange={(open) => setPlanEditor((current) => ({ ...current, open }))}>
          <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="border-b px-6 py-5 pr-12">
                <DialogTitle>{planEditor.type === 'diet' ? 'Customize Diet Plan' : 'Customize Exercise Plan'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={planEditor.name} onChange={(e) => setPlanEditor((current) => ({ ...current, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tag</Label>
                    <Input value={planEditor.tag} onChange={(e) => setPlanEditor((current) => ({ ...current, tag: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={planEditor.description} onChange={(e) => setPlanEditor((current) => ({ ...current, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plan Content</Label>
                    <PlanContentEditor value={planEditor.planContent} onChange={(nextPlanContent) => setPlanEditor((current) => ({ ...current, planContent: nextPlanContent }))} />
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t px-6 py-4 pr-12">
                <Button type="button" variant="outline" onClick={() => setPlanEditor((current) => ({ ...current, open: false }))}>Cancel</Button>
                <Button type="button" variant="gradient" onClick={savePlanCustomization} disabled={assignmentSaving}>Save Custom Copy</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <PlanContentPreviewDialog
          open={Boolean(previewPlan)}
          onOpenChange={(open) => !open && setPreviewPlan(null)}
          title={previewPlan?.title || "Plan Preview"}
          value={previewPlan?.value || null}
        />

        <DeleteConfirmationDialog
          open={Boolean(pendingAssignmentDelete)}
          onOpenChange={(open) => !open && setPendingAssignmentDelete(null)}
          title={`Remove ${pendingAssignmentDelete?.type === 'diet' ? 'Diet' : 'Exercise'} Plan?`}
          description="This removes the assigned plan from this member. The shared template and any other member assignments will remain unchanged."
          onConfirm={confirmRemoveAssignedPlan}
          confirmDisabled={assignmentSaving}
          confirmLabel={assignmentSaving ? "Removing..." : "Remove"}
        />
      </div>
    </AppLayout>
  );
}
