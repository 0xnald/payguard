# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


class PayGuard(gl.Contract):
    jobs: TreeMap[str, str]
    job_count: u32

    def __init__(self):
        self.job_count = u32(0)

    @gl.public.write.payable
    def create_job(self, title: str, description: str, client_address: str, escrow_amount: str) -> typing.Any:
        locked_amount = gl.message.value
        if locked_amount <= u256(0):
            raise gl.vm.UserError("Create a job with escrow GEN attached")
        if not title.strip():
            raise gl.vm.UserError("Title is required")
        if not description.strip():
            raise gl.vm.UserError("Description is required")
        if not client_address.strip():
            raise gl.vm.UserError("Client address is required")

        self.job_count = u32(self.job_count + 1)
        job_id = str(int(self.job_count))

        job = {
            "id": job_id,
            "title": title,
            "description": description,
            "client": client_address,
            "freelancer": "",
            "deliverable": "",
            "escrow_amount": str(int(locked_amount)),
            "escrow_label": escrow_amount,
            "escrow_released": False,
            "escrow_status": "HELD",
            "status": "OPEN",
            "verdict": "",
            "verdict_reasoning": "",
        }

        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def cancel_job(self, job_id: str, client_address: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.vm.UserError("Job not found")

        job = json.loads(raw)

        if job["client"].lower() != client_address.lower():
            raise gl.vm.UserError("Only the client can cancel this job")

        if job["status"] != "OPEN":
            raise gl.vm.UserError("Job can only be cancelled while it is open")

        if job.get("escrow_released", False):
            raise gl.vm.UserError("Escrow has already been released")

        amount = u256(int(job.get("escrow_amount", "0")))
        if amount <= u256(0):
            raise gl.vm.UserError("Escrow is empty")

        job["status"] = "CANCELLED"
        job["escrow_released"] = True
        job["escrow_status"] = "REFUNDED"
        gl.ContractAt(Address(job["client"])).emit_transfer(value=amount)
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def accept_job(self, job_id: str, freelancer_address: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.vm.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "OPEN":
            raise gl.vm.UserError("Job is not open")

        if job["client"].lower() == freelancer_address.lower():
            raise gl.vm.UserError("Job creator cannot accept their own job")

        job["freelancer"] = freelancer_address
        job["status"] = "IN_PROGRESS"
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def submit_deliverable(self, job_id: str, deliverable: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.vm.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "IN_PROGRESS":
            raise gl.vm.UserError("Job is not in progress")

        job["deliverable"] = deliverable
        job["status"] = "SUBMITTED"
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def approve_delivery(self, job_id: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.vm.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "SUBMITTED":
            raise gl.vm.UserError("No deliverable to approve")
        if not job["freelancer"]:
            raise gl.vm.UserError("No freelancer assigned")
        if job.get("escrow_released", False):
            raise gl.vm.UserError("Escrow has already been released")

        amount = u256(int(job.get("escrow_amount", "0")))
        if amount <= u256(0):
            raise gl.vm.UserError("Escrow is empty")

        job["status"] = "APPROVED"
        job["verdict"] = "APPROVED_BY_CLIENT"
        job["verdict_reasoning"] = "Client approved the deliverable without dispute."
        job["escrow_released"] = True
        job["escrow_status"] = "RELEASED"
        gl.ContractAt(Address(job["freelancer"])).emit_transfer(value=amount)
        self.jobs[job_id] = json.dumps(job)

    @gl.public.write
    def raise_dispute(self, job_id: str, client_complaint: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.vm.UserError("Job not found")

        job = json.loads(raw)

        if job["status"] != "SUBMITTED":
            raise gl.vm.UserError("No deliverable to dispute")
        if not job["freelancer"]:
            raise gl.vm.UserError("No freelancer assigned")
        if job.get("escrow_released", False):
            raise gl.vm.UserError("Escrow has already been released")

        title = job["title"]
        description = job["description"]
        deliverable = job["deliverable"]

        dispute_prompt = f"""You are an impartial arbitrator in a freelance work dispute.

JOB TITLE: {title}

JOB DESCRIPTION (what the client asked for):
{description}

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
- The client cannot reject work just because they changed their mind."""

        def normalize_response(raw_response: typing.Any) -> dict:
            if isinstance(raw_response, dict):
                parsed_response = raw_response
            else:
                parsed_response = json.loads(str(raw_response))

            response_verdict = parsed_response.get("verdict", "FREELANCER")
            if response_verdict not in ("FREELANCER", "CLIENT"):
                response_verdict = "FREELANCER"

            response_match = int(parsed_response.get("match_percentage", 0))
            if response_match < 0:
                response_match = 0
            if response_match > 100:
                response_match = 100

            return {
                "verdict": response_verdict,
                "reasoning": str(parsed_response.get("reasoning", "")),
                "match_percentage": response_match,
            }

        def leader_fn() -> str:
            raw_result = gl.nondet.exec_prompt(dispute_prompt, response_format="json")
            return json.dumps(normalize_response(raw_result), sort_keys=True)

        def validator_fn(leader_result: typing.Any) -> bool:
            if isinstance(leader_result, gl.vm.Return):
                leader_payload = leader_result.calldata
            else:
                leader_payload = leader_result

            leader_decision = normalize_response(leader_payload)
            validator_decision = normalize_response(leader_fn())

            same_verdict = leader_decision["verdict"] == validator_decision["verdict"]
            close_match = abs(leader_decision["match_percentage"] - validator_decision["match_percentage"]) <= 15
            return same_verdict and close_match

        parsed = normalize_response(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

        amount = u256(int(job.get("escrow_amount", "0")))
        if amount <= u256(0):
            raise gl.vm.UserError("Escrow is empty")

        if parsed["verdict"] == "FREELANCER":
            job["status"] = "RESOLVED_FOR_FREELANCER"
            job["escrow_status"] = "RELEASED"
            gl.ContractAt(Address(job["freelancer"])).emit_transfer(value=amount)
        else:
            job["status"] = "RESOLVED_FOR_CLIENT"
            job["escrow_status"] = "REFUNDED"
            gl.ContractAt(Address(job["client"])).emit_transfer(value=amount)

        job["escrow_released"] = True
        job["verdict"] = parsed["verdict"]
        job["verdict_reasoning"] = parsed["reasoning"]
        job["match_percentage"] = parsed["match_percentage"]
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
        return json.dumps({"total_jobs": int(self.job_count), "contract_balance": str(int(self.balance))})
