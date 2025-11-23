import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InstacartShoppingListItem {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

interface CreateShoppingListRequest {
  items: InstacartShoppingListItem[];
  title?: string;
  retailer_key?: string;
}

interface InstacartShoppingListResponse {
  products_link_url: string;
}

interface GetNearbyRetailersRequest {
  postal_code: string;
  country_code: string;
}

interface Retailer {
  retailer_key: string;
  name: string;
  retailer_logo_url: string;
}

interface GetNearbyRetailersResponse {
  retailers: Retailer[];
}

Deno.serve(async (req: Request) => {
  // 🔹 1) Get or generate correlation ID for this request
  const incomingId = req.headers.get("x-correlation-id");
  const correlationId = incomingId ?? crypto.randomUUID();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "x-correlation-id": correlationId,
      },
    });
  }

  try {
    const instacartApiKey = Deno.env.get("INSTACART_API_KEY");
    if (!instacartApiKey) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "INSTACART_API_KEY missing",
          correlationId,
        }),
      );
      throw new Error("INSTACART_API_KEY environment variable is not set");
    }

    const { action, ...payload } = await req.json();

    const instacartBaseUrl = "https://connect.dev.instacart.tools";

    // 🔹 Optional ping action for diagnostics
    if (action === "ping") {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "instacart-shopping-list ping",
          correlationId,
        }),
      );
      return new Response(
        JSON.stringify({ ok: true, source: "instacart-shopping-list" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "x-correlation-id": correlationId,
          },
        },
      );
    }

    switch (action) {
      case "create_shopping_list": {
        const listRequest: CreateShoppingListRequest = payload;

        if (!listRequest.items || listRequest.items.length === 0) {
          return new Response(
            JSON.stringify({ error: "At least one item is required" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "x-correlation-id": correlationId,
              },
            },
          );
        }

        const formattedItems = listRequest.items.map((item) => {
          const formattedItem: any = {
            name: item.name,
          };

          if (item.quantity && item.unit) {
            formattedItem.measurements = [
              {
                quantity: item.quantity,
                unit: item.unit,
              },
            ];
          }

          if (item.category) {
            formattedItem.category = item.category;
          }

          return formattedItem;
        });

        const instacartPayload: any = {
          title: listRequest.title || "Shopping List",
          line_items: formattedItems,
        };

        if (listRequest.retailer_key) {
          instacartPayload.retailer_key = listRequest.retailer_key;
        }

        console.log(
          JSON.stringify({
            level: "info",
            msg: "Calling Instacart create_shopping_list",
            correlationId,
            endpoint: `${instacartBaseUrl}/idp/v1/products/products_link`,
            payload: instacartPayload,
          }),
        );

        const response = await fetch(
          `${instacartBaseUrl}/idp/v1/products/products_link`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${instacartApiKey}`,
            },
            body: JSON.stringify(instacartPayload),
          },
        );

        const contentType = response.headers.get("content-type");
        let responseData: any;
        let responseText: string;

        try {
          responseText = await response.text();
          console.log(
            JSON.stringify({
              level: "info",
              msg: "Instacart create_shopping_list raw response",
              correlationId,
              status: response.status,
              contentType,
              responseText,
            }),
          );

          if (contentType?.includes("application/json") && responseText) {
            responseData = JSON.parse(responseText);
          } else {
            responseData = { raw: responseText };
          }
        } catch (parseError) {
          console.error(
            JSON.stringify({
              level: "error",
              msg: "Failed to parse Instacart response",
              correlationId,
              error: String(parseError),
            }),
          );
          responseData = { raw: responseText || "Empty response" };
        }

        if (!response.ok) {
          console.error(
            JSON.stringify({
              level: "error",
              msg: "Instacart API error (create_shopping_list)",
              correlationId,
              status: response.status,
              endpoint: `${instacartBaseUrl}/idp/v1/products/products_link`,
              details: responseData,
            }),
          );
          return new Response(
            JSON.stringify({
              error: "Failed to create Instacart shopping list",
              details: responseData,
              status: response.status,
              endpoint: `${instacartBaseUrl}/idp/v1/products/products_link`,
            }),
            {
              status: response.status,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "x-correlation-id": correlationId,
              },
            },
          );
        }

        console.log(
          JSON.stringify({
            level: "info",
            msg: "Instacart shopping list created",
            correlationId,
            responseData,
          }),
        );

        return new Response(JSON.stringify(responseData as InstacartShoppingListResponse), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "x-correlation-id": correlationId,
          },
        });
      }

      case "get_nearby_retailers": {
        const retailerRequest: GetNearbyRetailersRequest = payload;

        if (!retailerRequest.postal_code || !retailerRequest.country_code) {
          return new Response(
            JSON.stringify({
              error: "postal_code and country_code are required",
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "x-correlation-id": correlationId,
              },
            },
          );
        }

        if (!["US", "CA"].includes(retailerRequest.country_code.toUpperCase())) {
          return new Response(
            JSON.stringify({ error: "country_code must be 'US' or 'CA'" }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "x-correlation-id": correlationId,
              },
            },
          );
        }

        const params = new URLSearchParams({
          postal_code: retailerRequest.postal_code,
          country_code: retailerRequest.country_code.toUpperCase(),
        });

        const apiUrl = `${instacartBaseUrl}/idp/v1/retailers?${params.toString()}`;
        console.log(
          JSON.stringify({
            level: "info",
            msg: "Calling Instacart get_nearby_retailers",
            correlationId,
            apiUrl,
          }),
        );

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${instacartApiKey}`,
          },
        });

        const contentType = response.headers.get("content-type");
        let responseData: any;
        let responseText: string;

        try {
          responseText = await response.text();
          console.log(
            JSON.stringify({
              level: "info",
              msg: "Instacart get_nearby_retailers raw response",
              correlationId,
              status: response.status,
              contentType,
              responseText,
            }),
          );

          if (contentType?.includes("application/json") && responseText) {
            responseData = JSON.parse(responseText);
          } else {
            responseData = { raw: responseText };
          }
        } catch (parseError) {
          console.error(
            JSON.stringify({
              level: "error",
              msg: "Failed to parse Instacart retailers response",
              correlationId,
              error: String(parseError),
            }),
          );
          responseData = { raw: responseText || "Empty response" };
        }

        if (!response.ok) {
          console.error(
            JSON.stringify({
              level: "error",
              msg: "Instacart API error (get_nearby_retailers)",
              correlationId,
              status: response.status,
              endpoint: apiUrl,
              details: responseData,
            }),
          );
          return new Response(
            JSON.stringify({
              error: "Failed to get nearby retailers",
              details: responseData,
              status: response.status,
              endpoint: apiUrl,
            }),
            {
              status: response.status,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "x-correlation-id": correlationId,
              },
            },
          );
        }

        console.log(
          JSON.stringify({
            level: "info",
            msg: "Instacart retailers fetched",
            correlationId,
            responseData,
          }),
        );

        return new Response(JSON.stringify(responseData as GetNearbyRetailersResponse), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "x-correlation-id": correlationId,
          },
        });
      }

      default:
        return new Response(
          JSON.stringify({
            error:
              "Invalid action. Supported actions: create_shopping_list, get_nearby_retailers, ping",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "x-correlation-id": correlationId,
            },
          },
        );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Edge function error",
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "x-correlation-id": correlationId,
        },
      },
    );
  }
});
