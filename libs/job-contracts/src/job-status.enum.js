export var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["QUEUED"] = "QUEUED";
    JobStatus["RUNNING"] = "RUNNING";
    JobStatus["RETRY_SCHEDULED"] = "RETRY_SCHEDULED";
    JobStatus["SUCCEEDED"] = "SUCCEEDED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["DEAD_LETTERED"] = "DEAD_LETTERED";
    JobStatus["CANCELLED"] = "CANCELLED";
})(JobStatus || (JobStatus = {}));
//# sourceMappingURL=job-status.enum.js.map