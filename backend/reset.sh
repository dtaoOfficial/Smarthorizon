#!/bin/bash

set -e

CONTAINER="smarthorizon-backend-1"
CONTAINER_SCRIPT="dist/reset_marks_and_assignments.js"

echo "==============================================================="
echo "  SMART HORIZON - RESET MARKS & JUDGE ASSIGNMENTS"
echo "==============================================================="
echo

# Check container
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "❌ Backend container '$CONTAINER' is not running."
    echo "Run: docker compose up -d"
    exit 1
fi

echo "✅ Backend container is running."

# Check compiled script exists inside the container (production images ship
# only dist/, not src/, so run the already-built JS rather than copying and
# transpiling the .ts source)
if ! docker exec "$CONTAINER" test -f "$CONTAINER_SCRIPT"; then
    echo "❌ Cannot find $CONTAINER_SCRIPT inside container '$CONTAINER'."
    echo "Rebuild the backend image (docker compose build backend) so it includes the latest reset script."
    exit 1
fi

echo "✅ Reset script found in container: $CONTAINER_SCRIPT"
echo
echo "⚠️  WARNING"
echo "This will DELETE:"
echo "  - Review scores"
echo "  - Review overrides"
echo "  - Reviews"
echo "  - Evaluation claims"
echo "  - Judge assignments"
echo "  - Jury/student feedback"
echo "  - Review-related notifications"
echo
echo "Attendance/check-in fields are NOT intentionally modified."
echo

read -p "Are you sure you want to continue? Type RESET: " CONFIRM

if [ "$CONFIRM" != "RESET" ]; then
    echo
    echo "❌ Reset cancelled."
    exit 0
fi

echo
echo "🚀 Running reset..."
echo

docker exec "$CONTAINER" node "$CONTAINER_SCRIPT"

echo
echo "==============================================================="
echo "  ✅ RESET FINISHED"
echo "==============================================================="
