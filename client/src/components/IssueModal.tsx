import { useState } from "react";
import { useCreateIssue } from "@/hooks/use-beautician";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";

interface IssueModalProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueModal({ orderId, open, onOpenChange }: IssueModalProps) {
  const createIssue = useCreateIssue();
  const [type, setType] = useState("Cab Not Available");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    // In a real app, we'd get current geolocation here
    const mockLat = 40.7128; 
    const mockLng = -74.0060;

    createIssue.mutate({
      orderId,
      issueType: type,
      notes,
      latitude: mockLat,
      longitude: mockLng
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Help us understand what went wrong. Support will be notified immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Select Reason</Label>
            <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-1 gap-3">
              {["Cab Not Available", "Customer Not Reachable", "Wrong Address", "Service Dispute", "Other"].map((reason) => (
                <div key={reason} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="flex-1 cursor-pointer font-normal">{reason}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Please describe the situation..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={createIssue.isPending}
          >
            {createIssue.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
