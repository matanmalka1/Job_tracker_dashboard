import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { fetchApplications, updateApplication } from "../api/client.ts";
import type { JobApplication } from "../types/index.ts";
import LoadingSpinner from "../components/ui/LoadingSpinner.tsx";
import InterviewCard from "./interviews/InterviewCard";

const getWeekKey = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const formatWeekLabel = (isoMonday: string): string => {
  const monday = new Date(isoMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const now = new Date();
  const thisMonday = new Date(getWeekKey(now.toISOString()));
  const diff =
    (monday.getTime() - thisMonday.getTime()) / (1000 * 60 * 60 * 24 * 7);
  if (diff === 0) return `This Week  (${fmt(monday)} – ${fmt(sunday)})`;
  if (diff === -1) return `Last Week  (${fmt(monday)} – ${fmt(sunday)})`;
  if (diff === 1) return `Next Week  (${fmt(monday)} – ${fmt(sunday)})`;
  return `${fmt(monday)} – ${fmt(sunday)}`;
};

const InterviewsPage = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["applications", "interviewing"],
    queryFn: () =>
      fetchApplications({ status: "interviewing", limit: 500, offset: 0 }),
  });

  const { mutate: moveStatus, isPending } = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "offer" | "rejected";
    }) => updateApplication(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(
        status === "offer" ? "Moved to Offer!" : "Marked as Rejected",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const interviews = useMemo(() => data?.items ?? [], [data]);

  const grouped = useMemo(() => {
    const map = new Map<string, JobApplication[]>();
    for (const app of interviews) {
      const key = getWeekKey(app.applied_at ?? app.created_at);
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, app]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [interviews]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Interviews</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data
            ? `${data.total} active interview${data.total !== 1 ? "s" : ""}`
            : "Loading…"}
        </p>
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading interviews…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load interviews.</p>
        </div>
      )}

      {!isLoading && !isError && interviews.length === 0 && (
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            No active interviews
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Move applications to the \"Interviewing\" stage to track them here.
          </p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([weekKey, apps]) => (
            <div key={weekKey}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-gray-500 text-xs font-medium whitespace-nowrap">
                  {formatWeekLabel(weekKey)}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                  <InterviewCard
                    key={app.id}
                    app={app}
                    loading={isPending}
                    onMoveOffer={(id) => moveStatus({ id, status: "offer" })}
                    onMoveRejected={(id) =>
                      moveStatus({ id, status: "rejected" })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewsPage;
