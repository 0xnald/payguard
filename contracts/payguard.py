# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


class PayGuard(gl.Contract):
    jobs: TreeMap[str, str]
    job_count: u32

    def __init__(self):
        self.job_count = u32(0)

    @gl.public.write
    def create_job(self, title: str, description: str, client_address: str, escrow_amount: str) -> typing.Any:
        self.job_count = u32(self.job_count + 1)
        job_id = str(int(self.job_count))

        job = {
            "id": job_id,
            "title": title,
            "description": description,
            "client": client_address,
            "freelancer": "",
            "deliverable": "",
            "escrow_amount": escrow_amount,
            "status": "OPEN",
            "verdict": "",
            "verdict_reasoning": "",
        }

        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def cancel_job(self, job_id: str, client_address: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")

        job = json.loads(raw)

        if job["client"].lower() != client_address.lower():
            raise gl.UserError("Only the client can cancel this job")

        if job["status"] != "OPEN":
            raise gl.UserError("Job can only be cancelled while it is open")

        job["status"] = "CANCELLED"
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def accept_job(self, job_id: str, freelancer_address: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "OPEN":
            raise gl.UserError("Job is not open")

        if job["client"].lower() == freelancer_address.lower():
            raise gl.UserError("Job creator cannot accept their own job")

        job["freelancer"] = freelancer_address
        job["status"] = "IN_PROGRESS"
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def submit_deliverable(self, job_id: str, deliverable: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "IN_PROGRESS":
            raise gl.UserError("Job is not in progress")

        job["deliverable"] = deliverable
        job["status"] = "SUBMITTED"
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def approve_delivery(self, job_id: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "SUBMITTED":
            raise gl.UserError("No deliverable to approve")

        job["status"] = "APPROVED"
        job["verdict"] = "APPROVED_BY_CLIENT"
        job["verdict_reasoning"] = "Client approved the deliverable without dispute."
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def raise_dispute(self, job_id: str, client_complaint: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "SUBMITTED":
            raise gl.UserError("No deliverable to dispute")

        job_description = job["description"]
        deliverable = job["deliverable"]
        title = job["title"]

        result = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(
                f"""You are an impartial arbitrator in a freelance work dispute.

JOB TITLE: {title}

JOB DESCRIPTION (what the client asked for):
{job_description}

FREELANCER'S DELIVERABLE (what was submitted):
{deliverable}

CLIENT'S COMPLAINT:
{client_complaint}

Based on the job description and the deliverable submitted, make a fair judgment:
- Did the freelancer deliver what was reasonably asked for?
- Is the client's complaint valid?

Return ONLY a JSON object:
{{
    "verdict": "FREELANCER" or "CLIENT",
    "reasoning": "2-3 sentence explanation of your decision",
    "match_percentage": <0-100 how well the deliverable matches the job>
}}

Rules:
- If the deliverable substantially matches the job description, rule for FREELANCER
- If the deliverable is clearly incomplete, off-topic, or low effort, rule for CLIENT
- Be fair. Minor imperfections should not void payment.
- The client cannot reject work just because they changed their mind.""",
                response_format='json'
            ),
            principle="`verdict` field must be exactly the same. `match_percentage` must be within 15 points. `reasoning` can differ.",
        )

        if isinstance(result, str):
            try:
                first = result.find("{")
                last = result.rfind("}")
                if first != -1 and last != -1:
                    parsed = json.loads(result[first:last + 1])
                else:
                    parsed = {"verdict": "FREELANCER", "reasoning": "Could not parse, defaulting to freelancer", "match_percentage": 50}
            except json.JSONDecodeError:
                parsed = {"verdict": "FREELANCER", "reasoning": "Could not parse, defaulting to freelancer", "match_percentage": 50}
        elif isinstance(result, dict):
            parsed = result
        else:
            parsed = {"verdict": "FREELANCER", "reasoning": "Unknown result format", "match_percentage": 50}

        verdict = parsed.get("verdict", "FREELANCER")
        if verdict not in ("FREELANCER", "CLIENT"):
            verdict = "FREELANCER"

        if verdict == "FREELANCER":
            job["status"] = "RESOLVED_FOR_FREELANCER"
        else:
            job["status"] = "RESOLVED_FOR_CLIENT"

        job["verdict"] = verdict
        job["verdict_reasoning"] = parsed.get("reasoning", "")
        job["match_percentage"] = parsed.get("match_percentage", 0)
        self.jobs[job_id] = json.dumps(job)

    @gl.public.view
    def get_job(self, job_id: str) -> str:
        result = self.jobs.get(job_id, None)
        if result is None:
            return json.dumps({"error": "Job not found"})
        return result

    @gl.public.view
    def get_all_jobs(self) -> str:
        all_jobs = {}
        for jid, data_str in self.jobs.items():
            all_jobs[jid] = json.loads(data_str)
        return json.dumps({"total": int(self.job_count), "jobs": all_jobs})

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"total_jobs": int(self.job_count)})
