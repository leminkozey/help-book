# Charts (Chart.js)

A fenced code block tagged `chart` with a Chart.js config (as JSON) renders as an interactive chart. Chart.js is loaded from `cdn.jsdelivr.net` on demand — chapters without a chart pay no cost.

## Bar

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "datasets": [{
      "label": "Downloads",
      "data": [120, 180, 240, 310, 420, 510],
      "backgroundColor": "#e8791d"
    }]
  }
}
```

## Line

```chart
{
  "type": "line",
  "data": {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "datasets": [
      {
        "label": "Sessions",
        "data": [42, 51, 49, 60, 72, 35, 30],
        "borderColor": "#e8791d",
        "backgroundColor": "rgba(232, 121, 29, 0.2)",
        "tension": 0.35,
        "fill": true
      },
      {
        "label": "Conversions",
        "data": [8, 12, 11, 14, 18, 6, 5],
        "borderColor": "#3b82f6",
        "backgroundColor": "rgba(59, 130, 246, 0.2)",
        "tension": 0.35,
        "fill": true
      }
    ]
  }
}
```

## Doughnut

```chart
{
  "type": "doughnut",
  "data": {
    "labels": ["Markdown", "JS", "CSS", "HTML"],
    "datasets": [{
      "data": [55, 25, 15, 5],
      "backgroundColor": ["#e8791d", "#3b82f6", "#22c55e", "#a78bfa"]
    }]
  }
}
```

## Radar

```chart
{
  "type": "radar",
  "data": {
    "labels": ["Speed", "DX", "Security", "Customization", "Accessibility", "Footprint"],
    "datasets": [{
      "label": "help-book",
      "data": [9, 8, 9, 7, 8, 10],
      "borderColor": "#e8791d",
      "backgroundColor": "rgba(232, 121, 29, 0.25)"
    }]
  }
}
```

## How it works

Pass any valid Chart.js config as JSON. Charts re-render on theme toggle so axis and grid colors match. If the JSON is invalid or `Chart` fails to initialize, the original source is shown with an error banner — readers never see a broken canvas.
