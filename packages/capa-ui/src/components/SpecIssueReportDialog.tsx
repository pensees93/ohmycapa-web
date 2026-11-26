import { useEffect, useId, useRef, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField,
} from '@mui/material';
import { collectSpecLogExcerpts, prepareUnclassifiedSpecIssueDraft, type UnclassifiedSpecIssueReport } from '@ohmycapa/capa-core';
import { useOptionalCapaCompare } from '../contexts/CapaCompareContext';

interface SpecIssueReportDialogProps {
  report: UnclassifiedSpecIssueReport;
  onClose: () => void;
  onOpenUrl?: (url: string) => void;
}

export function SpecIssueReportDialog({ report, onClose, onOpenUrl }: SpecIssueReportDialogProps) {
  const titleId = useId();
  const excerptId = useId();
  const bodyId = useId();
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const compare = useOptionalCapaCompare();
  const filesA = compare?.deviceA.files;
  const filesB = compare?.deviceB.files;
  const [autoExcerpt, setAutoExcerpt] = useState<string | null>(null);
  const [editedExcerpt, setEditedExcerpt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasRawLogs = Boolean(filesA?.some(file => file.ast) || filesB?.some(file => file.ast));
  const findingExcerpt = hasRawLogs && autoExcerpt === null && editedExcerpt === null;
  const excerpt = editedExcerpt ?? autoExcerpt ?? '';
  const draft = prepareUnclassifiedSpecIssueDraft(report, excerpt);

  useEffect(() => {
    let active = true;
    void collectSpecLogExcerpts(report.specs, [...(filesA ?? []), ...(filesB ?? [])])
      .catch(() => '')
      .then(text => { if (active) setAutoExcerpt(text); });
    return () => { active = false; };
  }, [report.specs, filesA, filesB]);

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(draft.markdownBody);
      setCopied(true);
    } catch {
      bodyInput.current?.focus();
      bodyInput.current?.select();
    }
  };

  const openDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft.markdownBody);
      if (draft.requiresCopy) setCopied(true);
    } catch {
      if (draft.requiresCopy) {
        bodyInput.current?.focus();
        bodyInput.current?.select();
      }
    }
    if (onOpenUrl) onOpenUrl(draft.issueUrl);
    else window.open(draft.issueUrl, '_blank', 'noopener,noreferrer');
    if (!draft.requiresCopy) onClose();
  };

  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} maxWidth="sm" fullWidth>
      <DialogTitle id={titleId}>Prepare GitHub Issue</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            id={excerptId}
            label="Raw log excerpt (optional)"
            helperText={findingExcerpt
              ? 'Finding matching lines in the original logs…'
              : autoExcerpt
                ? 'Review the matching source lines. You can edit or remove them.'
                : 'Paste the field with its parent fields or array entry so the parser can be tested.'}
            value={excerpt}
            onChange={event => {
              setEditedExcerpt(event.target.value);
              setCopied(false);
            }}
            multiline
            minRows={4}
            maxRows={10}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { spellCheck: false }, input: { sx: { fontFamily: 'monospace' } } }}
          />
          {draft.requiresCopy && (
            <>
              <Alert severity="info">The report is too long to prefill. Copy the full Issue body and paste it into the GitHub description.</Alert>
              <TextField
                id={bodyId}
                label="Full Issue body"
                value={draft.markdownBody}
                inputRef={bodyInput}
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace' } } }}
                helperText={copied ? 'Copied to clipboard.' : 'You can also select and copy this text manually.'}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {draft.requiresCopy && <Button onClick={() => void copyBody()}>Copy full Issue body</Button>}
        <Button variant="contained" disabled={findingExcerpt} onClick={openDraft}>Open GitHub draft</Button>
      </DialogActions>
    </Dialog>
  );
}
