import { useEffect, useState } from "react";

import { downloadAuditLogsCsv, getAuditLogs } from "../../api/adminApi";
import { t } from "../../i18n";

export default function AdminAuditPage({ lang }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(25);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const hasActiveFilters = Boolean(
    actionFilter || entityTypeFilter || searchText || actorFilter || startDate || endDate
  );

  const loadLogs = async (overrides = {}) => {
    const effectiveLimit = overrides.limit ?? limit;
    const effectiveOffset = overrides.offset ?? offset;
    const effectiveAction = overrides.actionFilter ?? actionFilter;
    const effectiveEntityType = overrides.entityTypeFilter ?? entityTypeFilter;
    const effectiveSearch = overrides.searchText ?? searchText;
    const effectiveActor = overrides.actorFilter ?? actorFilter;
    const effectiveStartDate = overrides.startDate ?? startDate;
    const effectiveEndDate = overrides.endDate ?? endDate;

    const data = await getAuditLogs({
      limit: effectiveLimit,
      offset: effectiveOffset,
      action: effectiveAction,
      entityType: effectiveEntityType,
      q: effectiveSearch,
      actorUserId: effectiveActor,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    });
    setAuditLogs(data.items || []);
    setTotal(data.total || 0);
  };

  const updateFiltersAndReload = async (updates) => {
    const nextState = {
      actionFilter,
      entityTypeFilter,
      searchText,
      actorFilter,
      startDate,
      endDate,
      ...updates,
    };

    if (Object.prototype.hasOwnProperty.call(updates, "actionFilter")) setActionFilter(nextState.actionFilter);
    if (Object.prototype.hasOwnProperty.call(updates, "entityTypeFilter")) setEntityTypeFilter(nextState.entityTypeFilter);
    if (Object.prototype.hasOwnProperty.call(updates, "searchText")) setSearchText(nextState.searchText);
    if (Object.prototype.hasOwnProperty.call(updates, "actorFilter")) setActorFilter(nextState.actorFilter);
    if (Object.prototype.hasOwnProperty.call(updates, "startDate")) setStartDate(nextState.startDate);
    if (Object.prototype.hasOwnProperty.call(updates, "endDate")) setEndDate(nextState.endDate);

    setOffset(0);
    try {
      await loadLogs({ ...nextState, offset: 0 });
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadLogs();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "actionFailed"));
      }
    })();
  }, [lang, limit, offset]);

  const onApplyFilters = async () => {
    setError("");
    try {
      await loadLogs({ offset: 0 });
      if (offset !== 0) {
        setOffset(0);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  const onPrev = async () => {
    if (offset === 0) return;
    setOffset(Math.max(0, offset - limit));
  };

  const onNext = async () => {
    if (offset + limit >= total) return;
    setOffset(offset + limit);
  };

  const onExportCsv = async () => {
    setError("");
    try {
      await downloadAuditLogsCsv({
        action: actionFilter,
        entityType: entityTypeFilter,
        q: searchText,
        actorUserId: actorFilter,
        startDate,
        endDate,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  const clearAllFilters = () => {
    return updateFiltersAndReload({
      actionFilter: "",
      entityTypeFilter: "",
      searchText: "",
      actorFilter: "",
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div className="card">
      <h3>{t(lang, "recentAdminActivity")}</h3>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
        <input
          placeholder={t(lang, "action")}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
        <input
          placeholder={t(lang, "entityType")}
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
        />
        <input
          placeholder={t(lang, "search")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <input
          placeholder={t(lang, "actorId")}
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={onApplyFilters}>{t(lang, "applyFilters")}</button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
        >
          {t(lang, "clearFilters")}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span>{t(lang, "activeView")}:</span>
        {actionFilter && (
          <button
            onClick={() => updateFiltersAndReload({ actionFilter: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "action")}: {actionFilter} x
          </button>
        )}
        {entityTypeFilter && (
          <button
            onClick={() => updateFiltersAndReload({ entityTypeFilter: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "entityType")}: {entityTypeFilter} x
          </button>
        )}
        {searchText && (
          <button
            onClick={() => updateFiltersAndReload({ searchText: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "search")}: {searchText} x
          </button>
        )}
        {actorFilter && (
          <button
            onClick={() => updateFiltersAndReload({ actorFilter: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "actorId")}: {actorFilter} x
          </button>
        )}
        {startDate && (
          <button
            onClick={() => updateFiltersAndReload({ startDate: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "fromDate")}: {startDate} x
          </button>
        )}
        {endDate && (
          <button
            onClick={() => updateFiltersAndReload({ endDate: "" })}
            style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
            title={t(lang, "removeChip")}
          >
            {t(lang, "toDate")}: {endDate} x
          </button>
        )}
        {!hasActiveFilters && (
          <span style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>
            {t(lang, "noActiveFilters")}
          </span>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <button onClick={onExportCsv}>{t(lang, "exportAuditCsv")}</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          {t(lang, "pageInfo")} {total === 0 ? 0 : offset + 1} - {Math.min(offset + limit, total)} / {total}
        </label>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 120, marginBottom: 0 }}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <button onClick={onPrev}>{t(lang, "previous")}</button>
        <button onClick={onNext}>{t(lang, "next")}</button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>{t(lang, "createdAt")}</th>
            <th>{t(lang, "actorId")}</th>
            <th>{t(lang, "action")}</th>
            <th>{t(lang, "entity")}</th>
            <th>{t(lang, "details")}</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => (
            <tr key={log.id}>
              <td>{log.created_at}</td>
              <td>{log.actor_user_id}</td>
              <td>{log.action}</td>
              <td>{log.entity_type}#{log.entity_id}</td>
              <td>{log.details}</td>
            </tr>
          ))}
          {auditLogs.length === 0 && (
            <tr>
              <td colSpan={5}>{t(lang, "noAuditLogs")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
