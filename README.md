# StudySpot AI

A student-friendly campus study finder prototype. It uses simulated occupancy values to demonstrate how a campus map, personal study preferences, ranked recommendations, and crowd forecasts can work together.

## Run locally

Open `index.html` in a modern browser. There is no build step or account setup.

## Prototype features

- Clickable Discover, Heatmap, Crowd Forecast, and Saved Spots screens for quick navigation.
- Campus map with a simple green (available), yellow (filling up), and red (crowded) occupancy heatmap and an ordered list of every study location.
- Search and quick filters for quiet spaces, outlets, availability, daylight, and group study.
- Preference-aware recommendations with match scores that respond to feedback, plus smart alternatives when a spot is crowded.
- Study-space details, estimated open seats, saved locations, and one-tap feedback.
- A location-specific arrival forecast for 30 minutes, 1 hour, or 2 hours, modeled from historical trends, class-time patterns, and simulated current occupancy.
- Responsive layout and keyboard-accessible search, dialogs, and recommendation cards.

All occupancy, availability, forecast, campus, class-time, and weather values are illustrative. No sensor or student check-in data is collected. A production version should connect to approved occupancy and schedule sources and retain only aggregated counts.
