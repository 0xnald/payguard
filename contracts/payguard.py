# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


@gl.evm.contract_interface
class NativeRecipient:
    class View:
        pass

    class Write:
        pass


class PayGuard(gl.Contract):
    jobs: TreeMap[str, str]
    job_count: u32
    total_escrowed: u256
    total_released: u256
    total_refunded: u256

    def __init__(self):
        self.job_count = u32(0)
        self.total_escrowed = u256(0)
        self.total_released = u256(0)
        self.total_refunded = u256(0)

    def _load_job(self, job_id: str) -> typing.Any:
        raw = self.jobs.get(job_id, None)
        if raw is None:
            raise gl.UserError("Job not found")
        return json.loads(raw)

    def _store_job(self, job_id: str, job: typing.Any) -> None:
        self.jobs[job_id] = json.dumps(job, sort_keys=True)

    def _caller(self) -> str:
        return str(gl.message.sender_address)

    def _is_caller(self, stored_address: str) -> bool:
        return stored_address.lower() == self._caller().lower()

    def _escrow_value(self, job: typing.Any) -> u256:
        return u256(int(job["escrow_amount_wei"]))

    def _transfer_escrow(self, recipient: str, amount: u256) -> None:
        if amount == u256(0):
            raise gl.UserError("Escrow is empty")
        NativeRecipient(Address(recipient)).emit_transfer(value=amount)

    @gl.public.write.payable
    def create_job(self, title: str, description: str, escrow_amount: str) -> typing.Any:
        escrow_value = gl.message.value
        if escrow_value == u256(0):
            raise gl.UserError("Escrow payment is required")

        self.job_count = u32(self.job_count + 1)
        self.total_escrowed = u256(self.total_escrowed + escrow_value)
        job_id = str(int(self.job_count))

        job = {
            "id": job_id,
            "title": title,
            "description": description,
            "client": self._caller(),
            "freelancer": "",
            "deliverable": "",
            "escrow_amount": escrow_amount,
            "escrow_amount_wei": str(int(escrow_value)),
            "status": "OPEN",
            "verdict": "",
            "verdict_reasoning": "",
            "match_percentage": 0,
            "paid_to": "",
            "payment_tx": "HELD_IN_CONTRACT",
        }

        self._store_job(job_id, job)

    @gl.public.write
    def cancel_job(self, job_id: str) -> typing.Any:
        job = self._load_job(job_id)

        if not self._is_caller(job["client"]):
            raise gl.UserError("Only the client can cancel this job")

        if job["status"] != "OPEN":
            raise gl.UserError("Job can only be cancelled while it is open")

        escrow_value = self._escrow_value(job)
        job["status"] = "CANCELLED"
        job["verdict"] = "REFUNDED_TO_CLIENT"
        job["verdict_reasoning"] = "Client cancelled before a freelancer accepted the job."
        job["paid_to"] = job["client"]
        job["payment_tx"] = "REFUND_EMITTED"
        self.total_refunded = u256(self.total_refunded + escrow_value)
        self._store_job(job_id, job)
        self._transfer_escrow(job["client"], escrow_value)

    @gl.public.write
    def accept_job(self, job_id: str) -> typing.Any:
        job = self._load_job(job_id)

        if job["status"] != "OPEN":
            raise gl.UserError("Job is not open")

        if self._is_caller(job["client"]):
            raise gl.UserError("Job creator cannot accept their own job")

        job["freelancer"] = self._caller()
        job["status"] = "IN_PROGRESS"
        self._store_job(job_id, job)

    @gl.public.write
    def submit_deliverable(self, job_id: str, deliverable: str) -> typing.Any:
        job = self._load_job(job_id)

        if job["status"] != "IN_PROGRESS":
            raise gl.UserError("Job is not in progress")

        if not self._is_caller(job["freelancer"]):
            raise gl.UserError("Only the assigned freelancer can submit work")

        job["deliverable"] = deliverable
        job["status"] = "SUBMITTED"
        self._store_job(job_id, job)

    @gl.public.write
    def approve_delivery(self, job_id: str) -> typing.Any:
        job = self._load_job(job_id)

        if job["status"] != "SUBMITTED":
            raise gl.UserError("No deliverable to approve")

        if not self._is_caller(job["client"]):
            raise gl.UserError("Only the client can approve delivery")

        escrow_value = self._escrow_value(job)
        job["status"] = "APPROVED"
        job["verdict"] = "APPROVED_BY_CLIENT"
        job["verdict_reasoning"] = "Client approved the deliverable without dispute."
        job["paid_to"] = job["freelancer"]
        job["payment_tx"] = "RELEASE_EMITTED"
        self.total_released = u256(self.total_released + escrow_value)
        self._store_job(job_id, job)
        self._transfer_escrow(job["freelancer"], escrow_value)

    @gl.public.write
    def raise_dispute(self, job_id: str, client_complaint: str) -> typing.Any:
        job = self._load_job(job_id)

        if job["status"] != "SUBMITTED":
            raise gl.UserError("No deliverable to dispute")

        if not self._is_caller(job["client"]):
            raise gl.UserError("Only the client can dispute delivery")

        job_description = job["description"]
        deliverable = job["deliverable"]
        title = job["title"]

        prompt = f"""You are an impartial arbitrator in a freelance work dispute.

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

Return ONLY a JSON object with these fields:
- verdict: either FREELANCER or CLIENT
- reasoning: 2-3 sentence explanation of your decision
- match_percentage: integer from 0 to 100 showing how well the deliverable matches the job

Rules:
- If the deliverable substantially matches the job description, rule for FREELANCER.
- If the deliverable is clearly incomplete, off-topic, or low effort, rule for CLIENT.
- Minor imperfections should not void payment.
- The client cannot reject work just because they changed their mind."""

        def evaluate_dispute() -> typing.Any:
            response = gl.nondet.exec_prompt(prompt)
            if isinstance(response, str):
                start = response.find("{")
                end = response.rfind("}")
                if start == -1 or end == -1:
                    raise gl.UserError("Arbitrator returned invalid JSON")
                parsed_response = json.loads(response[start:end + 1])
            else:
                parsed_response = response

            verdict = parsed_response.get("verdict", "")
            if verdict not in ("FREELANCER", "CLIENT"):
                raise gl.UserError("Arbitrator returned invalid verdict")

            match_percentage = int(parsed_response.get("match_percentage", 0))
            if match_percentage < 0 or match_percentage > 100:
                raise gl.UserError("Arbitrator returned invalid match percentage")

            return {
                "verdict": verdict,
                "reasoning": str(parsed_response.get("reasoning", "")),
                "match_percentage": match_percentage,
            }

        result = gl.eq_principle.prompt_comparative(
            evaluate_dispute,
            principle=(
                "The `verdict` field must be exactly the same. "
                "The `match_percentage` field must be within 15 points. "
                "The `reasoning` field may differ if it supports the same verdict."
            ),
        )

        escrow_value = self._escrow_value(job)
        verdict = result["verdict"]
        job["verdict"] = verdict
        job["verdict_reasoning"] = result["reasoning"]
        job["match_percentage"] = result["match_percentage"]

        if verdict == "FREELANCER":
            job["status"] = "RESOLVED_FOR_FREELANCER"
            job["paid_to"] = job["freelancer"]
            job["payment_tx"] = "RELEASE_EMITTED"
            self.total_released = u256(self.total_released + escrow_value)
            self._store_job(job_id, job)
            self._transfer_escrow(job["freelancer"], escrow_value)
        else:
            job["status"] = "RESOLVED_FOR_CLIENT"
            job["paid_to"] = job["client"]
            job["payment_tx"] = "REFUND_EMITTED"
            self.total_refunded = u256(self.total_refunded + escrow_value)
            self._store_job(job_id, job)
            self._transfer_escrow(job["client"], escrow_value)

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
        return json.dumps({
            "total_jobs": int(self.job_count),
            "total_escrowed_wei": str(int(self.total_escrowed)),
            "total_released_wei": str(int(self.total_released)),
            "total_refunded_wei": str(int(self.total_refunded)),
        })
