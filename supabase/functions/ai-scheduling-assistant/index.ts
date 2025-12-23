import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctors, leaveRequests, existingAssignments, targetDate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing scheduling request for date:", targetDate);
    console.log("Doctors count:", doctors?.length);
    console.log("Leave requests count:", leaveRequests?.length);
    console.log("Existing assignments count:", existingAssignments?.length);

    const systemPrompt = `You are an intelligent hospital duty scheduling assistant. Your role is to create optimal duty assignments for doctors based on:
1. Doctor availability (considering approved leave requests)
2. Workload balance (distribute duties fairly across doctors)
3. Department coverage (ensure all units are covered)
4. Night duty rotation (fair distribution of night duties)

Duty types available: OPD, OT, Ward, Night Duty, Camp, Emergency
Units available: General OPD, Surgery OT, Medical Ward, ICU, Emergency Room, Pediatrics

Rules:
- Each doctor should have at most one duty per day
- Doctors on approved leave cannot be assigned
- Night duty should rotate fairly
- Ensure at least one doctor in Emergency at all times
- Balance workload based on recent assignment history

Respond with a JSON object containing:
{
  "assignments": [
    {
      "doctorId": "uuid",
      "doctorName": "name",
      "dutyType": "OPD|OT|Ward|Night Duty|Camp|Emergency",
      "unit": "unit name",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "brief explanation"
    }
  ],
  "reasoning": "overall explanation of the scheduling decisions",
  "workloadSummary": {
    "balanced": true/false,
    "notes": "any concerns or recommendations"
  }
}`;

    const userPrompt = `Please create optimal duty assignments for ${targetDate}.

Available Doctors:
${JSON.stringify(doctors, null, 2)}

Approved Leave Requests (doctors unavailable):
${JSON.stringify(leaveRequests?.filter((l: any) => l.status === 'approved') || [], null, 2)}

Recent/Existing Assignments (for workload context):
${JSON.stringify(existingAssignments || [], null, 2)}

Create a balanced schedule ensuring all critical units are covered and workload is distributed fairly.`;

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
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response received, parsing...");

    // Extract JSON from the response
    let result;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content);
      
      // Return a structured error with the raw content
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response",
        rawContent: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully generated scheduling suggestions");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-scheduling-assistant:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
