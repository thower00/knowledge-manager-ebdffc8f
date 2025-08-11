import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { toastSuccess, toastInfo, toastWarning, toastError } from "@/lib/toast";

export function ToastsTab() {
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toast Playground</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Trigger different toast types to verify look and timing.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => toastSuccess({ title: "Saved", description: "Your changes were saved." })}>
            Success
          </Button>
          <Button variant="outline" onClick={() => toastInfo({ title: "Info", description: "Background task started." })}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => toastWarning({ title: "Warning", description: "Please review your input." })}>
            Warning
          </Button>
          <Button variant="destructive" onClick={() => toastError({ title: "Error", description: "Something went wrong." })}>
            Error
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Auto-dismiss after ~5.5s, max 4 concurrent toasts.
        </div>
      </CardContent>
    </Card>
  );
}
