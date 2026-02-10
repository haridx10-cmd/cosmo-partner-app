import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Phone, MapPin, Clock, User } from "lucide-react";

interface IssuesPanelProps {
  dateRange?: { from: Date; to: Date };
}

export default function IssuesPanel({ dateRange }: IssuesPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: [api.admin.allIssues.path, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let url = api.admin.allIssues.path;
      if (dateRange) {
        const params = new URLSearchParams({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        });
        url += `?${params}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (issueId: number) => {
      const url = buildUrl(api.admin.resolveIssue.path, { id: issueId });
      const res = await fetch(url, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to resolve issue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.allIssues.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.overview.path] });
      toast({ title: "Issue Resolved", description: "Issue has been marked as resolved." });
    },
  });

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}</div>;
  }

  const allIssues = data || [];
  const openIssues = allIssues.filter((item: any) => item.issue.status === "open");
  const resolvedIssues = allIssues.filter((item: any) => item.issue.status === "resolved");

  return (
    <div className="space-y-4 mt-4" data-testid="issues-panel">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        Open Issues ({openIssues.length})
      </h3>

      {openIssues.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            No open issues
          </CardContent>
        </Card>
      ) : (
        openIssues.map(({ issue, employeeName, orderDetails }: any) => (
          <Card key={issue.id} className="border-l-4 border-l-red-500 border-0 shadow-sm rounded-md">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge variant="destructive" className="text-xs mb-2">{issue.issueType}</Badge>
                  <div className="font-semibold text-gray-900">{employeeName || "Unknown"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {issue.createdAt ? format(new Date(issue.createdAt), "MMM d, h:mm a") : "N/A"}
                  </div>
                </div>
              </div>

              {orderDetails && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{orderDetails.customerName}</span>
                    <span className="text-muted-foreground"> - &#8377;{orderDetails.amount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`tel:${orderDetails.phone}`} className="text-primary underline">{orderDetails.phone}</a>
                  </div>
                  <div className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                    <span>{orderDetails.address}</span>
                  </div>
                </div>
              )}

              {issue.notes && (
                <div className="text-sm text-gray-600 mb-3 italic">"{issue.notes}"</div>
              )}

              {issue.latitude && issue.longitude && (
                <div className="text-xs text-muted-foreground mb-3">
                  GPS: {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => resolveMutation.mutate(issue.id)}
                  disabled={resolveMutation.isPending}
                  data-testid={`button-resolve-${issue.id}`}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Resolve
                </Button>
                {orderDetails?.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${orderDetails.phone}`}>Call Customer</a>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {resolvedIssues.length > 0 && (
        <>
          <h3 className="font-semibold text-gray-500 mt-6">Resolved ({resolvedIssues.length})</h3>
          {resolvedIssues.slice(0, 5).map(({ issue, employeeName, orderDetails }: any) => (
            <Card key={issue.id} className="border-0 shadow-sm opacity-60">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Badge variant="secondary" className="text-xs mb-1">{issue.issueType}</Badge>
                    <div className="text-sm text-gray-600">{employeeName} - {orderDetails?.customerName}</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
