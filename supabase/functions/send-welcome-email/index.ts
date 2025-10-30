import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName }: WelcomeEmailRequest = await req.json();
    
    // Use APP_URL from environment, fallback to the actual published app URL
    const appUrl = Deno.env.get("APP_URL") || "https://knowledge-manager-02.lovable.app";

    const emailResponse = await resend.emails.send({
      from: "Knowledge Manager <onboarding@resend.dev>",
      to: [email],
      subject: "Välkommen till Knowledge Manager!",
      html: `
        <h1>Välkommen till Knowledge Manager${firstName ? `, ${firstName}` : ''}!</h1>
        <p>Ditt konto har skapats av en administratör.</p>
        <p>För att komma igång behöver du sätta ett nytt lösenord:</p>
        <ol>
          <li>Gå till inloggningssidan på <a href="${appUrl}">${appUrl.replace('https://', '')}</a></li>
          <li>Klicka på "Glömt lösenord?"</li>
          <li>Ange din e-postadress: <strong>${email}</strong></li>
          <li>Följ instruktionerna i det mail du får för att sätta ditt lösenord</li>
        </ol>
        <p>Efter att du har satt ditt lösenord kan du logga in och börja använda systemet.</p>
        <p>Välkommen!<br>Knowledge Manager Team</p>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);