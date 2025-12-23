from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scripts.generate_recommendations import generate_recommendations_apriori

app = FastAPI(title="ML Recommendation Service")

class AprioriRequest(BaseModel):
    min_support: float = 0.4
    min_confidence: float = 0.5

@app.post("/recommendations/apriori")
def generate_apriori(req: AprioriRequest):
    try:
        result = generate_recommendations_apriori(
            min_support=req.min_support,
            min_confidence=req.min_confidence
        )

        return {
            "status": "success",
            "total_rules": len(result),
            "rules": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
