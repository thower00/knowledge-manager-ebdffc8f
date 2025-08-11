import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function RegistrationSettings() {
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRegistrationSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('value')
        .eq('key', 'allow_public_registration')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setAllowPublicRegistration(data.value as boolean);
      }
    } catch (error) {
      console.error("Error fetching registration settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load registration settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRegistrationSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configurations')
        .upsert({
          key: 'allow_public_registration',
          value: allowPublicRegistration,
          description: 'Controls whether new users can register themselves or only admins can create users'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: `Public registration has been ${allowPublicRegistration ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error("Error saving registration settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchRegistrationSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Registration Security Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="public-registration">Allow Public Registration</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, new users can register themselves with email verification. 
              When disabled, only admins can create new user accounts.
            </p>
          </div>
          <Switch
            id="public-registration"
            checked={allowPublicRegistration}
            onCheckedChange={setAllowPublicRegistration}
          />
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={saveRegistrationSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Current Setting:</h4>
          <p className="text-sm">
            {allowPublicRegistration 
              ? "✅ Public registration is enabled - Users can register themselves"
              : "🔒 Public registration is disabled - Only admins can create users"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}