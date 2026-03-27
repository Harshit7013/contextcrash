import os
import time
import uuid
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import openai
except ImportError:
    openai = None

app = Flask(__name__)
CORS(app)  # Enable CORS for React/Frontend integration

# --- IN-MEMORY STORAGE ---
store = {
    "queries": {}
}

# --- PREDEFINED DOCUMENTS ---
DOCUMENTS = {
    "fee_rules.txt": "Semester fee must be paid before the 15th of the starting month. Late fees apply after the 15th. Exam fees are separate.",
    "hostel_rules.txt": "Hostel fees must be paid in full at the beginning of the semester. Refunds are only applicable if a student withdraws within the first 14 days of classes. No refunds are allowed after 14 days.",
    "exam_schedule.txt": "Exams start on the 10th of the last month of the semester. Students must clear all fee dues to get their admit cards.",
    "admission_faq.txt": "Admission cancellation within 14 days guarantees 100% refund on tuition fees. Meal plan and hostel refunds are processed completely separately by the housing office."
}

# --- HELPER FUNCTIONS ---
def construct_prompt(question, chunks):
    context = "\n".join([f"[{c['doc']}] {c['content']}" for c in chunks])
    return f"System: You are an academic advisor AI. Use the provided context to answer the user's question accurately. If you don't know, say so.\nContext:\n{context}\n\nUser: {question}"

def simulate_retrieval(question, is_rerun=False):
    question_lower = question.lower()
    
    if is_rerun:
        # Fixed retrieval for rerun
        if "hostel" in question_lower and "refund" in question_lower:
            return [
                {"doc": "hostel_rules.txt", "content": DOCUMENTS["hostel_rules.txt"], "score": 0.92}
            ]
        elif "fee" in question_lower:
            return [
                {"doc": "fee_rules.txt", "content": DOCUMENTS["fee_rules.txt"], "score": 0.88}
            ]
        return [
            {"doc": "exam_schedule.txt", "content": DOCUMENTS["exam_schedule.txt"], "score": 0.89}
        ]

    # Intentional failure cases
    if "hostel" in question_lower and "refund" in question_lower:
        # Intentional Context Confusion
        return [
            {"doc": "hostel_rules.txt", "content": DOCUMENTS["hostel_rules.txt"], "score": 0.82},
            {"doc": "admission_faq.txt", "content": DOCUMENTS["admission_faq.txt"], "score": 0.45}
        ]
    elif "fee" in question_lower:
        # Good retrieval
        return [
            {"doc": "fee_rules.txt", "content": DOCUMENTS["fee_rules.txt"], "score": 0.85},
            {"doc": "exam_schedule.txt", "content": DOCUMENTS["exam_schedule.txt"], "score": 0.75}
        ]
    elif "professor" in question_lower:
        # Wrong Retrieval
        return [
            {"doc": "exam_schedule.txt", "content": DOCUMENTS["exam_schedule.txt"], "score": 0.25},
            {"doc": "admission_faq.txt", "content": DOCUMENTS["admission_faq.txt"], "score": 0.15}
        ]
    else:
        return [
            {"doc": "exam_schedule.txt", "content": DOCUMENTS["exam_schedule.txt"], "score": 0.80}
        ]

def generate_answer(question, chunks, is_rerun=False):
    # Simulated answers based on retrieval to mimic an LLM without incurring API costs
    question_lower = question.lower()
    
    if is_rerun:
        if "hostel" in question_lower and "refund" in question_lower:
            return "Hostel refunds are only allowed if you withdraw within the first 14 days of classes. No refunds are allowed after that period."
        elif "fee" in question_lower:
            return "Semester fees must be paid before the 15th of the starting month to avoid late fees."
        return "I can help with rules regarding fees, hostels, and exams."

    if "hostel" in question_lower and "refund" in question_lower:
        # Intentional Hallucination / Contradiction
        return "Hostel refunds are fully processed anytime during the semester. If you need a refund, you should also contact the housing office to adjust your meal plan immediately."
    elif "fee" in question_lower:
        return "You must pay your semester fee before the 15th of the starting month. Also, you cannot take exams if fees are unpaid."
    elif "professor" in question_lower:
        # Cannot answer (Wrong Retrieval)
        return "To contact Professor Smith, you should check the exam schedule for their availability."
    else:
        return "Exams begin on the 10th of the final month of the semester. Ensure all dues are cleared."

def get_diagnosis(question, chunks, answer, is_rerun=False):
    if is_rerun:
        return {
            "type": "Resolved",
            "cause": "Data retrieval was filtered and constrained properly.",
            "confidence": 0.95,
            "fix": "No further action needed."
        }

    question_lower = question.lower()
    
    if "hostel" in question_lower and "refund" in question_lower:
        return {
            "type": "Hallucination / Contradiction",
            "cause": "The LLM ignored the explicit '14-day' constraint in chunk 1 and fabricated a lenient policy ('anytime').",
            "confidence": 0.87,
            "fix": "Filter chunks dropping similarities < 0.50 (Chunk 2 added noise). Add strict adherence system prompt."
        }
    elif "professor" in question_lower:
        return {
            "type": "Wrong Retrieval",
            "cause": "The retrieval system pulled completely irrelevant documents regarding exams and admissions for an email query.",
            "confidence": 0.94,
            "fix": "Implement a semantic router to reject out-of-domain queries or expand standard queries DB."
        }
    elif "fee" in question_lower:
        return {
            "type": "Context Confusion",
            "cause": "The LLM merged exam rules with fee rules awkwardly, though factually close.",
            "confidence": 0.65,
            "fix": "Segment the context specifically per subject entity."
        }
    else:
        return {
            "type": "None",
            "cause": "The query appeared to succeed safely.",
            "confidence": 0.99,
            "fix": "N/A"
        }

def determine_status(diagnosis_type):
    if diagnosis_type in ["Hallucination / Contradiction", "Wrong Retrieval"]:
        return "failed"
    elif diagnosis_type in ["Context Confusion"]:
        return "suspicious"
    return "success"

# --- API ENDPOINTS ---

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.json
    question = data.get("question", "What is the policy?")
    is_rerun = data.get("is_rerun", False)
    
    start_time = time.time()
    
    chunks = simulate_retrieval(question, is_rerun)
    prompt = construct_prompt(question, chunks)
    answer = generate_answer(question, chunks, is_rerun)
    diagnosis = get_diagnosis(question, chunks, answer, is_rerun)
    status = determine_status(diagnosis["type"])
    
    latency = round(time.time() - start_time + random.uniform(0.5, 1.5), 2)
    token_count = len(prompt.split()) + len(answer.split())
    
    query_id = str(uuid.uuid4())[:8]
    
    log_entry = {
        "id": query_id,
        "question": question,
        "retrieved_chunks": chunks,
        "prompt": prompt,
        "answer": answer,
        "diagnosis": diagnosis,
        "status": status,
        "timestamp": time.strftime("%I:%M %p"),
        "latency_s": latency,
        "tokens": token_count,
        "is_rerun": is_rerun
    }
    
    store["queries"][query_id] = log_entry
    
    return jsonify({
        "answer": answer,
        "query_id": query_id,
        **log_entry
    })

@app.route('/queries', methods=['GET'])
def get_queries():
    queries_list = []
    for q_id, q_data in reversed(store["queries"].items()):
        queries_list.append({
            "id": q_id,
            "question": q_data["question"],
            "status": q_data["status"],
            "timestamp": q_data["timestamp"],
            "is_rerun": q_data.get("is_rerun", False),
            "parent_id": q_data.get("parent_id")
        })
    return jsonify(queries_list)

@app.route('/query/<id>', methods=['GET'])
def get_query(id):
    query = store["queries"].get(id)
    if not query:
        return jsonify({"error": "Query not found"}), 404
    
    # Check if there is a fix for this query
    fix = None
    for q_data in store["queries"].values():
        if q_data.get("parent_id") == id:
            fix = q_data
            break
            
    response = dict(query)
    if fix:
        response["fix_history"] = fix
        
    return jsonify(response)

@app.route('/analytics', methods=['GET'])
def get_analytics():
    total = len(store["queries"])
    if total == 0:
        return jsonify({
            "total_queries": 0,
            "failure_rate": 0,
            "failure_distribution": {},
            "avg_latency": 0
        })
        
    failed_count = 0
    total_latency = 0
    dist = {}
    
    for q in store["queries"].values():
        total_latency += q.get("latency_s", 1.0)
        dt = q["diagnosis"]["type"]
        
        if dt != "None" and dt != "Resolved":
            failed_count += 1
            dist[dt] = dist.get(dt, 0) + 1
            
    failure_rate = round(failed_count / total, 2)
    avg_latency = round(total_latency / total, 2)
    
    return jsonify({
        "total_queries": total,
        "failure_rate": failure_rate,
        "failure_distribution": dist,
        "avg_latency": avg_latency
    })

@app.route('/rerun/<id>', methods=['POST'])
def rerun_query(id):
    original = store["queries"].get(id)
    if not original:
        return jsonify({"error": "Query not found"}), 404
        
    # Simulate re-running the same question but triggering the fixed paths
    question = original["question"]
    
    start_time = time.time()
    
    chunks = simulate_retrieval(question, is_rerun=True)
    prompt = construct_prompt(question, chunks)
    answer = generate_answer(question, chunks, is_rerun=True)
    diagnosis = get_diagnosis(question, chunks, answer, is_rerun=True)
    status = determine_status(diagnosis["type"])
    
    latency = round(time.time() - start_time + random.uniform(0.3, 0.8), 2)
    token_count = len(prompt.split()) + len(answer.split())
    
    new_id = f"{id}-fix"
    
    log_entry = {
        "id": new_id,
        "question": question,
        "retrieved_chunks": chunks,
        "prompt": prompt,
        "answer": answer,
        "diagnosis": diagnosis,
        "status": status,
        "timestamp": time.strftime("%I:%M %p"),
        "latency_s": latency,
        "tokens": token_count,
        "is_rerun": True,
        "parent_id": id
    }
    
    store["queries"][new_id] = log_entry
    
    return jsonify(log_entry)

# Seed initial data for demo purposes
def seed_data():
    questions = [
        "What is the last date to pay semester fee?",
        "When are end semester exams?",
        "What is hostel refund policy?",
        "Professor Smith's email address?"
    ]
    for q in questions:
        chunks = simulate_retrieval(q)
        ans = generate_answer(q, chunks)
        diag = get_diagnosis(q, chunks, ans)
        status = determine_status(diag["type"])
        
        qid = str(uuid.uuid4())[:8]
        store["queries"][qid] = {
            "id": qid,
            "question": q,
            "retrieved_chunks": chunks,
            "prompt": construct_prompt(q, chunks),
            "answer": ans,
            "diagnosis": diag,
            "status": status,
            "timestamp": time.strftime("%I:%M %p"),
            "latency_s": round(random.uniform(0.8, 2.5), 2),
            "tokens": random.randint(150, 450),
            "is_rerun": False
        }

if __name__ == '__main__':
    seed_data()
    app.run(debug=True, host='0.0.0.0', port=5000)
