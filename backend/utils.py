"""
Shared utility: call Gemini with exponential backoff on 429 rate-limit errors.
"""
import time
import json

def generate_with_retry(model, prompt: str, max_retries: int = 5) -> str:
    """Call Groq client with exponential backoff on 429 rate-limit errors."""
    delay = 5  # initial wait seconds
    client = model["client"]
    model_name = model["model_name"]
    
    for attempt in range(max_retries):
        try:
            print(f"[Groq API] Attempt {attempt + 1}/{max_retries} for model '{model_name}'...")
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_name
            )
            print(f"[Groq API] Success.")
            return response.choices[0].message.content.strip()
        except Exception as e:
            err = str(e)
            print(f"[Groq API] Error on attempt {attempt + 1}: {err}")
            # Check for rate limits (HTTP 429 or rate limit message)
            is_rate_limit = False
            if hasattr(e, "status_code") and e.status_code == 429:
                is_rate_limit = True
            elif "429" in err or "rate limit" in err.lower() or "limit exceeded" in err.lower():
                is_rate_limit = True
                
            if is_rate_limit:
                if attempt < max_retries - 1:
                    print(f"[Groq API] Rate limit hit. Retrying in {delay} seconds...")
                    time.sleep(delay)
                    delay = min(delay * 2, 60)  # cap at 60s
                    continue
            raise  # re-raise non-retryable errors
    raise RuntimeError("Max retries exceeded for Groq API call")


def parse_json_response(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        # parts[1] is the fenced content
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
