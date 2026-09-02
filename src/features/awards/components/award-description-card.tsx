"use client";

import { PenLine } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import type { ContentFieldData } from "@/src/features/content-field/content-field.types";

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function AwardDescriptionCard({
  data,
  dirty,
  editLabel,
  draftLabel,
  emptyLabel,
  onEdit,
}: {
  data: ContentFieldData;
  dirty: boolean;
  editLabel: string;
  draftLabel: string;
  emptyLabel: string;
  onEdit: () => void;
}) {
  const content = plainText(data.description?.shared?.und ?? "");
  return (
    <Card className="mb-5">
      <CardContent className="flex items-start justify-between gap-4 text-sm text-muted-foreground">
        <span>{content || emptyLabel}</span>
        <div className="flex shrink-0 items-center gap-3">
          {dirty ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-primary"
            >
              {draftLabel}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" leftIcon={PenLine} onClick={onEdit}>
            {editLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
