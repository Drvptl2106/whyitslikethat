"""Batch 1 — "Money, Visualized". All numbers are computed here so narration and charts always agree."""
from num2words import num2words

HANDLE = "@money.visualized"
VOICE = "am_michael"


def say_money(v, nearest=1000):
    return f"${round(v / nearest) * nearest:,}"


def money(v):
    return f"${round(v):,}"


# ---------- 1. The $5 daily habit ----------
daily, r, years = 5, 0.08, 30
yearly = daily * 365
invested = [yearly * ((1 + r) ** k - 1) / r for k in range(years + 1)]
saved = [yearly * k for k in range(years + 1)]
fv, contrib = invested[-1], saved[-1]
growth = fv - contrib

coffee = {
    "slug": "01-five-dollar-habit",
    "handle": HANDLE, "voice": VOICE,
    "caption": (f"Your $5/day habit is really a $200,000+ decision. ☕📈\n\n"
                f"$5 × 365 = {money(yearly)} a year. Invested at an 8% average annual return for 30 years, "
                f"that's {money(fv)} — and only {money(contrib)} of it is money you put in.\n\n"
                "Not saying skip the coffee. Just know the real price.\n\n"
                "Save this & follow for money, visualized.\n\n"
                "Assumes 8% average annual return, contributions at year end, no taxes or fees. Educational, not financial advice.\n\n"
                "#personalfinance #compoundinterest #investing #moneytips #financialfreedom #indexfunds #moneyvisualized"),
    "scenes": [
        {"type": "hook", "say": f"Your $5 a day habit is quietly costing you over {say_money(fv, 100000)}.",
         "lines": ["Your $5/day habit", ["really costs", "fg", 104], [money(fv), "green", 170]]},
        {"type": "counter", "say": f"$5 a day is {say_money(yearly, 1)} a year.",
         "label": "$5 × 365 days", "to": yearly, "sub": "every single year"},
        {"type": "line", "say": "Now, invest that instead, at an 8% average return, and watch what 30 years does.",
         "title": "$1,825/yr for 30 years", "subtitle": "8% avg. annual return", "xlabels": ("Year 0", "Year 30"),
         "series": [{"label": "Invested", "color": "green", "values": invested},
                    {"label": "Cash only", "color": "muted", "values": saved}]},
        {"type": "bars", "say": f"You only put in about {say_money(contrib)}. The other {say_money(growth)} is pure compound growth.",
         "title": "Where the money came from", "subtitle": "after 30 years",
         "bars": [{"label": "Your\ncontributions", "segments": [{"value": contrib, "color": "muted"}]},
                  {"label": "Final\nbalance", "color": "green",
                   "segments": [{"value": contrib, "color": "muted", "label": "You"},
                                {"value": growth, "color": "green", "label": "Growth"}]}]},
        {"type": "text", "say": "Not saying skip the coffee. Just know what it really costs. Follow for more money, visualized.",
         "lines": ["Not saying skip the coffee.", ["Just know the real price.", "green"], ["Follow for more ↗", "muted", 56]]},
    ],
}

# ---------- 2. Start at 25 vs 35 ----------
monthly, rm = 300, 0.08 / 12


def grow(start_age, end_age=65):
    bal, out = 0.0, []
    for age in range(25, end_age + 1):
        out.append(bal)
        if age >= start_age and age < end_age:
            for _ in range(12):
                bal = bal * (1 + rm) + monthly
    out[-1] = bal
    return out


early, late = grow(25), grow(35)
c_early, c_late = monthly * 12 * 40, monthly * 12 * 30
gap = early[-1] - late[-1]

start = {
    "slug": "02-start-at-25-vs-35",
    "handle": HANDLE, "voice": VOICE,
    "caption": (f"Same $300 a month. One person starts at 25, one at 35.\n\n"
                f"At 65: {money(early[-1])} vs {money(late[-1])}.\n"
                f"Waiting 10 years cost {money(gap)} — while only saving {money(c_early - c_late)} less.\n\n"
                "The best time to start was 10 years ago. The second best is today.\n\n"
                "Save this & send it to someone who keeps saying 'later'.\n\n"
                "Assumes 8% average annual return compounded monthly, no taxes or fees. Educational, not financial advice.\n\n"
                "#investing #compoundinterest #personalfinance #retirement #moneytips #financialliteracy #moneyvisualized"),
    "scenes": [
        {"type": "hook", "say": "Two people invest the exact same amount every month. One ends up with more than double.",
         "lines": ["Same $300/month.", ["One ends up with", "fg", 96], ["2× more.", "green", 170]]},
        {"type": "text", "say": "Alex starts at 25. Sam waits until 35. Both invest $300 a month until 65.",
         "lines": [["Alex starts at 25", "green", 92], ["Sam starts at 35", "amber", 92], ["$300/month · until 65", "muted", 56]]},
        {"type": "line", "say": "Here's what happens at an 8% average return.",
         "title": "$300/month until age 65", "subtitle": "8% avg. annual return", "xlabels": ("Age 25", "Age 65"),
         "series": [{"label": "Alex (25)", "color": "green", "values": early},
                    {"label": "Sam (35)", "color": "amber", "values": late}]},
        {"type": "bars", "say": f"Alex only put in {say_money(c_early - c_late)} more, but ends up with {say_money(gap, 10000)} more.",
         "title": "Put in vs. ended with", "subtitle": "at age 65",
         "bars": [{"label": "Alex\n(starts 25)", "color": "green",
                   "segments": [{"value": c_early, "color": "muted", "label": "In"},
                                {"value": early[-1] - c_early, "color": "green", "label": "Growth"}]},
                  {"label": "Sam\n(starts 35)", "color": "amber",
                   "segments": [{"value": c_late, "color": "muted", "label": "In"},
                                {"value": late[-1] - c_late, "color": "amber", "label": "Growth"}]}]},
        {"type": "text", "say": "Those 10 years are the most expensive years you'll ever waste. Start today. Follow for more money, visualized.",
         "lines": ["Waiting 10 years cost", [money(round(gap, -3)), "red", 150], ["Start today.", "green"]]},
    ],
}

# ---------- 3. Credit card minimum payment trap ----------
balance0, apr = 5000, 0.22
mr = apr / 12


def payoff(payment_fn):
    bal, months, interest, path = balance0, 0, 0.0, [balance0]
    while bal > 0.005:
        i = bal * mr
        pay = min(bal + i, payment_fn(bal, i))
        bal = bal + i - pay
        interest += i
        months += 1
        path.append(max(bal, 0))
    return months, interest, path


min_m, min_i, min_path = payoff(lambda b, i: max(25, i + 0.01 * b))
fix_m, fix_i, fix_path = payoff(lambda b, i: 200)
n = max(len(min_path), len(fix_path))
# sample yearly for a clean chart
pad = lambda p: p + [0] * (n - len(p))
min_y = pad(min_path)[::12] + [0]
fix_y = pad(fix_path)[::12] + [0]
yrs_min = min_m / 12

card = {
    "slug": "03-minimum-payment-trap",
    "handle": HANDLE, "voice": VOICE,
    "caption": (f"$5,000 on a credit card at 22% APR.\n\n"
                f"Pay only the minimum (interest + 1%, min $25): {yrs_min:.0f} years and {money(min_i)} in interest.\n"
                f"Pay $200 a month: {fix_m / 12:.1f} years and {money(fix_i)} in interest.\n\n"
                "The minimum payment is designed to keep you paying. Pay more than the minimum, every month.\n\n"
                "Save this & follow for money, visualized.\n\n"
                "Illustrative example; minimum-payment formulas vary by card issuer. Educational, not financial advice.\n\n"
                "#creditcard #debtfree #personalfinance #moneytips #debt #financialliteracy #moneyvisualized"),
    "scenes": [
        {"type": "hook", "say": f"If you only pay the minimum on a $5,000 credit card, it takes {round(yrs_min)} years to pay off.",
         "lines": ["$5,000 credit card.", ["Minimum payments only:", "fg", 88], [f"{yrs_min:.0f} years", "red", 170]]},
        {"type": "counter", "say": f"And you'd pay {say_money(min_i, 100)} in interest alone. More than the original balance.",
         "label": "Interest paid on $5,000", "to": min_i, "color": "red", "sub": "more than the original debt"},
        {"type": "line", "say": "Now compare that to paying a fixed $200 a month.",
         "title": "Balance over time", "subtitle": "$5,000 at 22% APR", "xlabels": ("Today", f"Year {len(min_y) - 1}"),
         "series": [{"label": "Minimum", "color": "red", "values": min_y},
                    {"label": "$200/mo", "color": "green", "values": fix_y}]},
        {"type": "bars", "say": f"$200 a month clears it in about {round(fix_m / 12)} years, with only {say_money(fix_i, 100)} in interest.",
         "title": "Total interest paid", "subtitle": "same $5,000 debt",
         "bars": [{"label": "Minimum\nonly", "color": "red", "segments": [{"value": min_i, "color": "red"}]},
                  {"label": "$200\n/month", "color": "green", "segments": [{"value": fix_i, "color": "green"}]}]},
        {"type": "text", "say": "The minimum payment is designed to keep you paying. Always pay more. Follow for more money, visualized.",
         "lines": ["The minimum payment", ["is designed to", "fg"], ["keep you paying.", "red"], ["Follow for more ↗", "muted", 56]]},
    ],
}

VIDEOS = [coffee, start, card]

if __name__ == "__main__":
    print("coffee", round(fv), round(contrib), round(growth))
    print("start", round(early[-1]), round(late[-1]), round(gap), c_early, c_late)
    print("card min", min_m, round(min_i), "fixed", fix_m, round(fix_i))
