const issuesByEventId = useMemo(() => {
  const map = new Map<string, LogIssue[]>();

  for (const issue of diagnostics.issues) {
    if (!issue.eventId) continue;

    map.set(issue.eventId, [...(map.get(issue.eventId) ?? []), issue]);
  }

  return map;
}, [diagnostics.issues]);
