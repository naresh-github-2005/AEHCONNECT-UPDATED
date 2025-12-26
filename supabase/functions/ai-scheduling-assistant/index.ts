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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing scheduling request for date:", targetDate);
    console.log("Doctors count:", doctors?.length);

    // Map doctors with correct role based on seniority
    const doctorDetails = doctors?.map((d: any) => ({
      id: d.id,
      name: d.name,
      role: mapSeniorityToRole(d.seniority || 'resident'), // Use mapped role, not designation
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

    const systemPrompt = `You are a hospital duty scheduler. Generate duty assignments as JSON only.

ROLE RULES:
- consultant: OPD, OT, Ward, Emergency, Today Doctor. NO Night Duty.
- fellow: All duties including Night Duty, OT, specialty OTs.
- pg: OPD, Ward, Night Duty, Emergency. NO OT duties, NO Today Doctor.

DUTY TYPES: OPD, OT, Cataract OT, Retina OT, Glaucoma OT, Cornea OT, Night Duty, Ward, Today Doctor, Camp, Emergency

RESPOND WITH ONLY VALID JSON. NO explanations or questions.`;

    const userPrompt = `Generate duty assignments for ${targetDate}.

AVAILABLE DOCTORS:
${JSON.stringify(availableDoctors, null, 2)}

CAMPS TODAY:
${JSON.stringify(campsToday, null, 2)}

Create balanced assignments. Return ONLY this JSON structure:
{"assignments":[{"doctorId":"id","doctorName":"name","dutyType":"type","unit":"unit","startTime":"HH:MM","endTime":"HH:MM","reason":"brief"}],"reasoning":"summary","workloadSummary":{"balanced":true,"fairnessScore":80,"concerns":[],"notes":""},"campAssignments":[],"ruleViolations":[]}`;

    console.log("Sending scheduling request to AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_schedule",
              description: "Create duty assignments for doctors",
              parameters: {
                type: "object",
                properties: {
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        doctorId: { type: "string" },
                        doctorName: { type: "string" },
                        dutyType: { type: "string" },
                        unit: { type: "string" },
                        startTime: { type: "string" },
                        endTime: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["doctorId", "doctorName", "dutyType", "unit", "startTime", "endTime"]
                    }
                  },
                  reasoning: { type: "string" },
                  workloadSummary: {
                    type: "object",
                    properties: {
                      balanced: { type: "boolean" },
                      fairnessScore: { type: "number" },
                      concerns: { type: "array", items: { type: "string" } },
                      notes: { type: "string" }
                    }
                  },
                  campAssignments: { type: "array" },
                  ruleViolations: { type: "array", items: { type: "string" } }
                },
                required: ["assignments", "reasoning", "workloadSummary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_schedule" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");
    
    let result;
    
    // First try to get tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
        console.log("Parsed from tool call");
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }
    
    // Fallback to content if no tool call
    if (!result) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
            console.log("Parsed from content");
          }
        } catch (e) {
          console.error("Failed to parse content:", e);
          console.log("Raw content:", content?.substring(0, 500));
        }
      }
    }
    
    if (!result) {
      return new Response(JSON.stringify({ 
        error: "Failed to generate schedule. Please try again.",
        assignments: [],
        reasoning: "AI response could not be parsed",
        workloadSummary: { balanced: false, fairnessScore: 0, concerns: ["Parse error"], notes: "" },
        campAssignments: [],
        ruleViolations: []
      }), {
        status: 200, // Return 200 with empty result instead of 500
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
