#!/bin/bash
# Check for DRIFT lines in live smoke summary
# This script is called from the workflow to avoid YAML flattening issues

SUMMARY_FILE="artifacts/live-smoke/summary.md"
STEP_SUMMARY="$GITHUB_STEP_SUMMARY"

if [ -f "$SUMMARY_FILE" ]; then
    # Cat the summary to the workflow step summary
    cat "$SUMMARY_FILE" >> "$STEP_SUMMARY"
    
    # Check for DRIFT lines - use grep with || true to always succeed
    if grep -q "^- DRIFT " "$SUMMARY_FILE" 2>/dev/null; then
        echo "" >> "$STEP_SUMMARY"
        echo "> Structure drift detected against committed baselines in tests/baselines/. Re-record with SMOKE_RECORD_BASELINE=1 after confirming the new shape is correct." >> "$STEP_SUMMARY"
    fi
else
    echo "## Live Smoke Summary" >> "$STEP_SUMMARY"
    echo "" >> "$STEP_SUMMARY"
    echo "- No live smoke summary was generated." >> "$STEP_SUMMARY"
fi
