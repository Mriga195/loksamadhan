const path = require('path');
const fs = require('fs');
const https = require('https');
const dns = require('dns');

// Ensure IPv4 is prioritized for external API connections
dns.setDefaultResultOrder('ipv4first');

/**
 * Converts a photo path or URL to an image input suitable for Groq Vision.
 * Handles:
 * 1. Full HTTPS URLs (e.g. Cloudinary, Unsplash) -> returns { type: 'image_url', image_url: { url } }
 * 2. Local relative paths (e.g. /uploads/...) -> reads from disk and converts to base64 data URL
 */
async function toGroqImageContent(photoUrlOrPath) {
  if (!photoUrlOrPath) return null;

  // Cloudinary, Unsplash, or remote HTTPS URL
  if (photoUrlOrPath.startsWith('http://') || photoUrlOrPath.startsWith('https://')) {
    return {
      type: 'image_url',
      image_url: { url: photoUrlOrPath },
    };
  }

  // Local /uploads path
  try {
    const cleanPath = photoUrlOrPath.replace(/^\/+/, '');
    const fullPath = path.join(__dirname, '..', cleanPath);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      // Groq rejects oversized base64 payloads. Uploads are capped at 5 MB and base64 inflates by
      // a third, so anything past this would come back as a 400 after a long upload.
      if (buffer.length > 3.5 * 1024 * 1024) {
        console.warn('[AI Vision] Local image too large to inline for AI analysis:', cleanPath);
        return null;
      }
      const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const base64 = buffer.toString('base64');
      return {
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` },
      };
    }
  } catch (err) {
    console.warn('[AI Vision] Failed to read local image for AI analysis:', err.message);
  }

  // A relative path the API cannot fetch is worse than nothing: the caller refuses to run rather
  // than ask the model to judge a repair from a single image.
  return null;
}

/**
 * Executes a POST request to Groq API using native https with IPv4 enforcement.
 * Avoids Node 22 undici connect timeouts with Cloudflare/Groq.
 */
function callGroqChat(apiKey, bodyObj) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(bodyObj);
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LokSamadhan-Civic-AI/1.0',
        'Content-Length': Buffer.byteLength(payload),
      },
      family: 4,
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, status: res.statusCode, data: JSON.parse(data) });
          } catch (err) {
            reject(new Error(`Failed to parse Groq response JSON: ${err.message}`));
          }
        } else {
          resolve({ ok: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq Vision API connection timed out after 15s'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Verifies resolution proof by comparing Before photo vs After evidence photo.
 * Uses Groq Cloud Vision models (Qwen 3.8 / 3.6 27B Vision) when GROQ_API_KEY is available.
 * Falls back to honest heuristic verification if key is absent or quota is reached.
 */
async function verifyResolutionProof({ beforePhoto, afterPhoto, category, title, resolutionNote }) {
  if (!beforePhoto || !afterPhoto) {
    return {
      verified: false,
      matchScore: null,
      confidence: 'Low',
      summary: 'Both Before and After photos are required for automated visual verification.',
      verifiedAt: new Date(),
      provider: 'heuristic',
    };
  }

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const models = ['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];

    try {
      const beforeContent = await toGroqImageContent(beforePhoto);
      const afterContent = await toGroqImageContent(afterPhoto);

      // Never send just one image: the model would happily score a comparison it never made.
      if (!beforeContent || !afterContent) {
        return {
          verified: false,
          matchScore: null,
          confidence: 'Low',
          summary: 'One of the evidence images could not be read for automated comparison. Manual inspection required.',
          verifiedAt: new Date(),
          provider: 'heuristic',
        };
      }

      const promptText = `You are an AI Civic Infrastructure Inspector evaluating municipal work for an Indian civic portal (LokSamadhan).
You are comparing two images:
1. BEFORE PHOTO: The civic complaint filed by a citizen (Category: ${category || 'General'}, Title: "${title || 'Civic issue'}").
2. AFTER PHOTO: The resolution proof submitted by municipal field workers (Officer Note: "${resolutionNote || 'Work completed'}").

Inspect whether the physical civic defect shown in the BEFORE photo appears repaired or addressed in the AFTER photo.
Check:
- Are the two photos taken in the same real-world location/setting? If they depict completely different places, objects, or stock photos, mark verified as false and matchScore under 15.
- For road/pothole: Has the crater or crack been filled, leveled, or freshly asphalted?
- For sanitation/garbage: Has the waste pile or overflow been cleared?
- For streetlight/electric: Has the light fixture, pole, or cabling been repaired/installed?
- For water/drainage: Has the drain cleared or water leak ceased?

Respond ONLY with a JSON object in this exact format, with no markdown fences, no backticks, and no extra text:
{
  "verified": true or false,
  "matchScore": integer between 0 and 100,
  "confidence": "High" or "Medium" or "Low",
  "summary": "A 1-2 sentence objective assessment describing whether the after photo confirms resolution of the before defect."
}`;

      for (const model of models) {
        try {
          const res = await callGroqChat(groqKey, {
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  beforeContent,
                  afterContent,
                ].filter(Boolean),
              },
            ],
            temperature: 0.1,
            max_tokens: 250,
            response_format: { type: 'json_object' },
          });

          if (res.ok) {
            const rawContent = res.data.choices?.[0]?.message?.content?.trim();
            if (rawContent) {
              // response_format asks for bare JSON, but a fenced block still shows up sometimes.
              const parsed = JSON.parse(rawContent.replace(/^```(?:json)?\s*|\s*```$/g, ''));
              const score = typeof parsed.matchScore === 'number'
                ? Math.min(100, Math.max(0, Math.round(parsed.matchScore)))
                : (parsed.verified ? 85 : 10);

              return {
                verified: Boolean(parsed.verified),
                matchScore: score,
                confidence: ['High', 'Medium', 'Low'].includes(parsed.confidence) ? parsed.confidence : 'High',
                summary: String(parsed.summary || 'Visual inspection complete.').trim(),
                verifiedAt: new Date(),
                provider: 'groq',
              };
            }
          } else {
            console.warn(`[AI Vision] Model ${model} returned HTTP ${res.status}:`, res.error?.substring(0, 200));
            // A bad key, a rejected payload or a quota that is out will fail identically on the
            // next model — only a rate limit or an unavailable model is worth retrying.
            if ([400, 401, 403, 413].includes(res.status)) break;
          }
        } catch (innerErr) {
          console.warn(`[AI Vision] Request failed for model ${model}:`, innerErr.message);
        }
      }
    } catch (err) {
      console.warn('[AI Vision] Groq Vision evaluation encountered an error, falling back to heuristic:', err.message);
    }
  }

  // ── Honest Heuristic fallback (when Groq key is absent or rate limit reached) ──
  const noteProvided = Boolean(resolutionNote && resolutionNote.trim().length >= 5);

  return {
    verified: false,
    matchScore: null,
    confidence: 'Low',
    summary: noteProvided
      ? `AI Vision service currently unavailable. Field officer reported: "${resolutionNote.trim()}". Pending manual verification.`
      : 'AI Vision service currently unavailable. Manual inspection required.',
    verifiedAt: new Date(),
    provider: 'heuristic',
  };
}

module.exports = {
  verifyResolutionProof,
};

