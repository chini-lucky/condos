# Condos design prototype

Open `prototype.html` in a browser. It is one working app, not static frames.

## How it works

- **Map first.** The route map fills the window. Pan by dragging. Zoom with pinch, the scroll wheel, a double-click, the + and − buttons, or the keyboard (`+` `−`, arrows).
- **Zoom is the navigation.** Tap a station, or zoom into it, and its units appear around it at their real walking distance and bearing. Rings mark 5, 10 and 15 minutes on foot (400 / 800 / 1200 m). There is no separate station screen.
- **The panel follows the map.**
  - Pan or zoom freely past 2.2× and the panel switches to the nearest station with units.
  - Zoom back out below 1.5× and it returns to the overview.
- **Back.**
  - A **‹ All stations** button sits on the map once you have zoomed in. It flies back to the home view.
  - Each panel page also has its own back arrow.
  - `Esc` steps back one level: edit → unit → station → overview, and add → station.
- **Zoom buttons.** Desktop only, and only + and −. Phones pinch, so they show none.
- **Detail panel.**
  - Desktop (≥ 960 px): a side panel on the left. A tab on its edge collapses it. Filters sit in a bar over the map to its right. Hovering a list card lights up its pin, and hovering a pin highlights its card.
  - Phone and tablet: a bottom sheet you drag between peek, half and full.
    - The overview peeks at 214 px. A station peeks at 132 px so the map stays big.
    - Half is 46% of the screen. A unit, and the add and edit forms, open full.
- **Stations.** Names only. No station codes. A coloured badge says which line it is: green **BTS** for Sukhumvit, teal **BTS** for Silom, blue **MRT** for the Blue Line. An interchange shows one badge per line. The station panel does not repeat the line name next to the badge.

## Panel

### Overview

- The **Condos · Bangkok** wordmark, then a count, such as "12 units near 5 stations".
- With filters on, one line sums them up, such as "Townhouse only, rent ≤ ฿20,000, with washer."
- One card per station that has units: line badge, name, unit count, and the lowest rent ("from ฿13k").
  - With filters on, the count reads "2 of 3 units".
  - A station with no matches stays in the list at half opacity.
  - On phones the cards scroll sideways. On desktop they stack.
- A line key sits under the list.
- There is no instruction text and no "how to read the map" section.

### Station

- **Header:** line badge, name, and "N units within X" (X is the furthest unit). With filters on, the header adds "· N match".
- **Add a unit**, then the units, nearest first.
- **Unit card:** thumbnail, name, then distance, walk time and type with its icon. Then the rent per month, the four facility icons (ticked or crossed out), and the status label.
- A unit that misses a selected facility drops to a **Missing a facility** group. It is half opacity and says what is missing ("No washer").
- A unit that misses the type or the max rent is left off the list.
- **Empty states:**
  - With nothing on file, the panel says "Nothing on file here yet." and offers **Nearest with units: …**. Tapping the station also shows a short toast.
  - When everything is filtered out, it says "Nothing here matches the filters."

### Unit

- **Top bar:** back arrow, then the station name with the walk time and distance, then the status label.
- **Body, in order:**
  1. A photo carousel with dots.
  2. Name.
  3. Type: a tower icon for a condominium, a house icon for a townhouse.
  4. Walk distance and time to the station, with its line badge.
  5. Monthly rent.
- **Status line** under the rent:
  - A rejected unit shows its reason.
  - A pending unit shows what it is waiting on.
  - A viewing shows the booked date and time in a tinted box.
- **Facilities:**
  - Size, beds and floor sit just above.
  - The four facilities are a name and a tick (or an empty circle), with no description.
  - Extra facilities are chips.
- **Notes:**
  - A timeline with an entry count.
  - Edit turns the note into a text box. The pencil becomes a tick. Enter saves, `Esc` cancels.
  - Delete asks inline ("Delete this note?" with Delete and Keep).
  - The composer at the bottom adds a note dated today.
- **Agent:**
  - The card starts collapsed and shows the initial, name and company.
  - Opening it shows phone and LINE, each with small text buttons: Call and Copy for the phone, LINE and Copy for LINE.
- **Edit unit** sits next to **Delete unit**.
  - Delete asks first ("Delete … ? It leaves the map.") with Delete and Keep. Edit hides while it asks.
  - Deleting returns to the station.

### Add and edit

- One shared form, with these fields:
  - Building / Unit
  - Type
  - Rent
  - Walk, in metres
  - Size, beds and floor
  - The four facilities as toggles
  - Any further facilities, added by name and removable with ×
  - The agent: name, company, phone and LINE
- The type buttons show only an icon and a name.
- **Add:** Save stays disabled until the name, type, rent and walk are filled. A new unit starts as pending, gets a first note, appears on the map, and opens its page.
- **Edit:** Save updates the pin, its distance and its callout, then returns to the unit.

## Filters

- **Phone:** one **Filters** pill. Tap it to open the set. A dot on the pill means a filter is on.
- **Desktop:** the full set is always shown in the bar.
- **Toggles:** Washer, Garden, Pool, Microwave, Condominium and Townhouse.
- **Max rent:** a slider only, from ฿10,000 to ฿35,000 in ฿500 steps. Its label reads "≤ ฿20,000". At the top of the slider it reads "Any", which means any rent.
- Selecting both types means all types.
- **Effect on the map:**
  - A unit that misses a facility, the type or the rent fades: its pin to 35% and its callout to 45%.
  - A station left with nothing matching fades to an empty dot.
  - The count on each station shows matching units only.

## Map

- The lines are traced from the official BTS route map (bts.co.th/eng/routemap.html):
  - BTS Sukhumvit from Ha Yaek Lat Phrao to Bearing
  - BTS Silom from National Stadium to Bang Wa
  - The MRT Blue loop, plus the start of the Lak Song branch
- Dashed stubs point on to Khu Khot, Kheha and Lak Song.
- Interchange connectors and the Chao Phraya are drawn for orientation. There is no scale bar.
- Station spacing is schematic. Unit distances are true to scale: 27 map units = 1 km.
- **Stations with units** use the count as the marker: a black circle with the number, in place of the station dot. Their names are bold. The count stays visible as you zoom.
- **Empty stations**, and stations filtered down to nothing, are a small dot at about 32% opacity.
  - Their names appear once the zoom gives them room.
  - Interchange names always show, at 70%.
- **Focused station:** its name grows. It moves to whichever side has the fewest unit pins.
- **Semantic zoom:**
  - Pins, leader lines and rings fade in between 1.7× and 2.5×.
  - Rings are full strength only for the focused or nearest station. Other stations' rings stay faint. Ring labels ("5 min · 400 m") show only on the focused or nearest station.
  - Callouts appear once 1 km is about 100 px or more, and only for the focused or nearest station.
    - A callout shows the name, distance, walk time, price and status.
    - Callouts keep clear of station markers, the focused name and the back button.
  - The unit dot itself does not change with status.

## Type

Instrument Sans throughout: map labels, panel, prices and distances (tabular figures). The river label is italic.

## Color

- App background `#F3F4F0`, surface `#FFFFFF`, ink `#161A17`, muted `#5C6560`, faint `#8B938C`, line `#D6DAD3`, wash `#E9ECE6`
- Line colours: BTS Sukhumvit `#78BE20`, BTS Silom `#00857C`, MRT Blue `#1E3E93`, river `#D3E6EE`
- Status colours (text on tint):
  - Available `#0C7A3E` on `#E3F0E7`
  - Viewing `#8E4B2A` on `#F4E9E2`
  - Pending `#6A655F` on `#EEECE8`
  - Rejected `#C4342A` on `#FBEDEC`
- Rejected red also marks the delete actions.

## Status

- Available, Viewing, Pending and Rejected are coloured only on the status label. The label appears on the callout when zoomed in, in the station list, and in the unit's top bar.
- Pending is gray because it is not confirmed yet.
- Unit dots stay the same.
- Rejected units stay on the map at full strength, with no strikethrough and no faded photos.

## Sample data

- 12 units: Thong Lo 4, Ari 3, On Nut 3, Phrom Phong 1 and Lumphini 1.
- One is a townhouse (Ari, pending).
- Agent phone numbers use the fake `0xx 000 xxxx` pattern.

## Deep links

For review, these jump straight to a state:

- `#thonglo`: the Thong Lo station
- `#unit-<id>`: a unit, for example `#unit-ideoq36`
- `#edit-<id>`: the edit form for a unit
- `#add-<station>`: the add form for a station, for example `#add-E6`
