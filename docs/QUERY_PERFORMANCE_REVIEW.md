# Database Query Performance Review

## 1. Analysis History Retrieval

**Query Identified:**
```python
ResumeAnalysis.objects.filter(user=request.user).order_by("-created_at", "-id")
```
(Found in `analyzer/views.py` inside `analysis_history` and `export_user_data`)

**Issue:**
This is a high-frequency query called every time a user views their dashboard. It filters by `user` and sorts by `created_at` (descending) and `id` (descending). Without a composite index, the database uses the `user_id` foreign key index to fetch all records for the user, then performs an in-memory sort on `created_at` and `id`. As a user accumulates more history, this sorting operation becomes a bottleneck.

**Solution:**
Added a composite index:
```python
models.Index(fields=["user", "-created_at", "-id"])
```
**Performance Impact (Expected):**
- **Before:** O(N log N) where N is the number of analyses belonging to the user (due to sorting).
- **After:** O(1) / O(limit) time to fetch the first page, as the database can read directly from the pre-sorted index.

## 2. Leaderboard Aggregation

**Query Identified:**
```python
analyses = ResumeAnalysis.objects.filter(target_role=track)
```
(Found in `analyzer/views.py` inside `skills_leaderboard_view`)

**Issue:**
The leaderboard aggregates common skills across all users for a given `target_role` (e.g., "Software Engineer"). Without an index on `target_role`, the database performs a full table scan over the entire `ResumeAnalysis` table to find matching rows. Since this is an aggregation query over the entire dataset, a full table scan severely degrades performance as total data volume grows.

**Solution:**
Added an index on `target_role`:
```python
models.Index(fields=["target_role"])
```
**Performance Impact (Expected):**
- **Before:** O(Total Analyses in DB). A sequential scan over potentially hundreds of thousands of rows.
- **After:** O(Analyses in Track). The database uses the index to instantly locate rows for the specific track, eliminating the full table scan.

## 3. Analysis Retrieval (Public Sharing)

**Query Identified:**
```python
analysis = get_object_or_404(ResumeAnalysis, share_id=share_id)
```
(Found in `analyzer/views.py` inside `get_shared_result`)

**Review:**
This query fetches a shared analysis using `share_id`. The `share_id` field is defined as a `UUIDField(unique=True)`. In Django, `unique=True` automatically creates a unique database index.

**Performance Impact:**
- **Status:** Already optimized. The existing unique index ensures O(1) lookup time. No changes required.
