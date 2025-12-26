import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map seniority to role for clear duty rules
function mapSeniorityToRole(seniority: string): string {
  switch (seniority) {
    case 'consultant':
    case 'senior_consultant':
      return 'consultant';
    case 'fellow':
      return 'fellow';
    case 'resident':
    case 'intern':
    default:
      return 'pg';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctors, leaveRequests, existingAssignments, targetDate, dutyStats, camps } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    console.log("Processing scheduling request for date:", targetDate);
    console.log("Doctors count:", doctors?.length);

    // Map doctors with correct role based on seniority
    const doctorDetails = doctors?.map((d: any) => ({
      id: d.id,
      name: d.name,
      role: mapSeniorityToRole(d.seniority || 'resident'),
      specialty: d.specialty || 'general',
      performanceScore: d.performance_score || 70,
      unit: d.unit || 'Unit 1',
      canDoNight: d.can_do_night !== false,
      canDoCamp: d.can_do_camp === true,
    })) || [];

    // Filter out doctors on approved leave
    const approvedLeaveIds = new Set(
      leaveRequests
        ?.filter((l: any) => (l.status === 'approved' || l.status === 'Approved'))
        ?.map((l: any) => l.doctor_id) || []
    );
    
    const availableDoctors = doctorDetails.filter((d: any) => !approvedLeaveIds.has(d.id));
    
    console.log("Available doctors after leave filter:", availableDoctors.length);

    // Build camp info for the target date
    const campsToday = camps?.filter((c: any) => c.camp_date === targetDate) || [];

    const prompt = `You are a hospital duty scheduler. Generate duty assignments as JSON only.

ROLE RULES:
- consultant: OPD, OT, Ward, Emergency, Today Doctor. NO Night Duty.
- fellow: All duties including Night Duty, OT, specialty OTs.
- pg: OPD, Ward, Night Duty, Emergency. NO OT duties, NO Today Doctor.

DUTY TYPES: OPD, OT, Cataract OT, Retina OT, Glaucoma OT, Cornea OT, Night Duty, Ward, Today Doctor, Camp, Emergency

Generate duty assignments for ${targetDate}.

AVAILABLE DOCTORS:
${JSON.stringify(availableDoctors, null, 2)}

CAMPS TODAY:
${JSON.stringify(campsToday, null, 2)}

Create balanced assignments. Return ONLY this JSON structure (no markdown, no explanation):
{"assignments":[{"doctorId":"id","doctorName":"name","dutyType":"type","unit":"unit","startTime":"HH:MM","endTime":"HH:MM","reason":"brief"}],"reasoning":"summary","workloadSummary":{"balanced":true,"fairnessScore":80,"concerns":[],"notes":""},"campAssignments":[],"ruleViolations":[]}`;

    console.log("Sending scheduling request to Google Gemini...");

    // Call Google's Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini response received");
    
    let result;
    
    // Extract content from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (content) {
      try {
        // Try to parse directly (since we requested JSON response)
        result = JSON.parse(content);
        console.log("Parsed JSON response successfully");
      } catch (e) {
        // Try to extract JSON from content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            console.log("Extracted and parsed JSON from content");
          } catch (e2) {
            console.error("Failed to parse extracted JSON:", e2);
          }
        }
      }
    }
    
    if (!result) {
      console.log("Raw content:", content?.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: "Failed to generate schedule. Please try again.",
        assignments: [],
        reasoning: "AI response could not be parsed",
        workloadSummary: { balanced: false, fairnessScore: 0, concerns: ["Parse error"], notes: "" },
        campAssignments: [],
        ruleViolations: []
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure result has all required fields
    result.assignments = result.assignments || [];
    result.campAssignments = result.campAssignments || [];
    result.ruleViolations = result.ruleViolations || [];
    result.workloadSummary = result.workloadSummary || { balanced: true, fairnessScore: 70, concerns: [], notes: "" };

    console.log("Successfully generated scheduling suggestions");
    console.log("Assignments count:", result.assignments?.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-scheduling-assistant:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      assignments: [],
      reasoning: "",
      workloadSummary: { balanced: false, fairnessScore: 0, concerns: [], notes: "" },
      campAssignments: [],
      ruleViolations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
