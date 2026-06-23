from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# ─────────────────────────────────────────────
#  Category tiebreak rank (lower = higher prio)
#  Food=1, Medicine=2, Electronics=3, Others=4
# ─────────────────────────────────────────────
CATEGORY_RANK = {
    "Food":        1,
    "Medicine":    2,
    "Electronics": 3,
    "Others":      4
}


# ─────────────────────────────────────────────
#  0/1 Knapsack Algorithm
# ─────────────────────────────────────────────
def knapsack_01(capacity: int, items: list[dict]) -> dict:
    """
    Classic 0/1 Knapsack via bottom-up DP.

    Tiebreaker: items are pre-sorted so that when two items have
    identical weight AND value, the one with the better category
    rank (Food > Medicine > Electronics > Others) gets preferred
    during backtracking (higher-index items are selected first).

    Sort order: (value ASC, category_rank DESC)  →  so Food with
    the same value lands at a higher index than Others.
    """
    n = len(items)
    if n == 0 or capacity <= 0:
        return {"selected_indices": [], "total_weight": 0, "total_value": 0}

    # Create a list of (original_index, item) sorted for tiebreaking
    # Lower category_rank = higher priority → we want those at HIGHER
    # array positions so backtracking picks them preferentially.
    # Sort ascending by value, then ascending by category_rank
    # (worst items first, best items last at high indices).
    order = sorted(
        range(n),
        key=lambda i: (items[i]["value"], -CATEGORY_RANK.get(items[i]["category"], 99))
    )
    sorted_items = [items[i] for i in order]

    # Build DP table on sorted_items
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w = sorted_items[i - 1]["weight"]
        v = sorted_items[i - 1]["value"]
        for cap in range(capacity + 1):
            dp[i][cap] = dp[i - 1][cap]
            if w <= cap:
                take = dp[i - 1][cap - w] + v
                if take > dp[i][cap]:
                    dp[i][cap] = take

    # Backtrack on sorted_items
    selected_sorted = []
    cap = capacity
    for i in range(n, 0, -1):
        if dp[i][cap] != dp[i - 1][cap]:
            selected_sorted.append(i - 1)   # index into sorted_items
            cap -= sorted_items[i - 1]["weight"]

    # Map back to original indices
    selected_original = set(order[si] for si in selected_sorted)

    total_weight = sum(items[i]["weight"] for i in selected_original)
    total_value  = sum(items[i]["value"]  for i in selected_original)

    return {
        "selected_indices": list(selected_original),
        "total_weight":     total_weight,
        "total_value":      total_value
    }


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/category-hint", methods=["POST"])
def category_hint():
    """Return a suggested value range hint for a given category."""
    data     = request.get_json()
    category = data.get("category", "Others")
    hints = {
        "Food":        {"hint": "Essential supply — suggest value 80–100",  "min": 80,  "max": 100},
        "Medicine":    {"hint": "Critical stock — suggest value 70–100",    "min": 70,  "max": 100},
        "Electronics": {"hint": "Valuable item — suggest value 40–70",      "min": 40,  "max": 70},
        "Others":      {"hint": "General item — suggest value 1–40",        "min": 1,   "max": 40}
    }
    return jsonify(hints.get(category, {"hint": "Enter any value", "min": 1, "max": 100}))


@app.route("/api/optimize", methods=["POST"])
def optimize():
    """
    Body:
      {
        "capacity": int,
        "items": [
          {"name": str, "weight": int, "category": str, "value": int}
        ]
      }
    The 'value' field is a free numeric input entered by the user.
    When weight AND value are equal for two items, category rank
    (Food > Medicine > Electronics > Others) decides selection.
    """
    data     = request.get_json()
    capacity = int(data.get("capacity", 0))
    raw      = data.get("items", [])

    # Build items list — value is user-supplied numeric field
    items = []
    max_value = 1  # for relative reason messages
    for it in raw:
        v = max(1, int(it.get("value", 1)))
        max_value = max(max_value, v)
        items.append({
            "name":     it.get("name", "Unknown"),
            "weight":   int(it.get("weight", 0)),
            "category": it.get("category", "Others"),
            "value":    v
        })

    result = knapsack_01(capacity, items)
    selected_set = set(result["selected_indices"])

    # Determine a "low value" threshold for reason messages
    # Items in the bottom 33% of the value range are "low priority"
    min_value   = min(it["value"] for it in items) if items else 1
    low_threshold = min_value + (max_value - min_value) * 0.33

    # Build per-item result with rejection reasons
    output = []
    for idx, item in enumerate(items):
        selected = idx in selected_set
        if selected:
            reason = "Optimized for maximum importance"
        else:
            if item["weight"] > capacity:
                reason = "Exceeds warehouse capacity"
            elif item["value"] <= low_threshold:
                reason = "Rejected due to low value (priority)"
            else:
                reason = "Skipped to fit higher value items"

        output.append({
            "name":     item["name"],
            "weight":   item["weight"],
            "category": item["category"],
            "value":    item["value"],
            "selected": selected,
            "reason":   reason
        })

    return jsonify({
        "results":            output,
        "total_weight":       result["total_weight"],
        "remaining_capacity": capacity - result["total_weight"],
        "total_value":        result["total_value"],
        "capacity":           capacity
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
