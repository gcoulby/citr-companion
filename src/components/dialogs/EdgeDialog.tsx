import { useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface Props {
  edgeId: string;
  onClose: () => void;
}

export function EdgeDialog({ edgeId, onClose }: Props) {
  const edge = useGraphStore((s) => s.edges[edgeId]);
  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);
  const [label, setLabel] = useState(edge?.label ?? '');
  const [notes, setNotes] = useState(edge?.notes ?? '');

  if (!edge) return null;

  const save = () => {
    updateEdge(edgeId, { label: label.trim() || undefined, notes: notes.trim() || undefined });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Relationship Label</Label>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="photographed at, associated with..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Evidence, dates, source..."
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={() => { deleteEdge(edgeId); onClose(); }}>Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
