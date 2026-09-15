"""Synthetic dataset generator for CivicTriage (Phase 1: Data Foundation).

Generates realistic, multilingual civic complaints with controlled category skew,
duplicate incidents, repeat problems, and operational resolution states.
Uses a deterministic seed (seed=42) for complete reproducibility.
"""

import csv
import json
import sys
from pathlib import Path
import random
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.data.schemas import ComplaintRecord

CONFIG_DIR = ROOT_DIR / "config"
DATA_DIR = ROOT_DIR / "data"

RANDOM_SEED = 42

# Realistic distribution weights for source channels
CHANNELS = [
    ("CM Helpline", 0.30),
    ("Municipal Helpline", 0.25),
    ("Mobile App", 0.25),
    ("Social Media", 0.10),
    ("Elected Representative", 0.10),
]

# Skewed category weights (high frequency for common issues like water, potholes, trash)
CATEGORY_WEIGHTS = {
    "Water outage": 18,
    "Garbage accumulation": 16,
    "Pothole": 15,
    "Drain blockage": 12,
    "Streetlight not working": 10,
    "Power outage": 9,
    "Water leakage": 8,
    "Overflowing sewage": 8,
    "Road damage": 7,
    "Low water pressure": 6,
    "Mosquito breeding / fogging request": 6,
    "Irregular garbage collection": 5,
    "Damaged manhole cover": 5,
    "Loose overhead wires": 5,
    "Contaminated water": 4,
    "Dead animal removal": 4,
    "Open dumping": 4,
    "Road obstruction": 4,
    "Stray dog menace": 4,
    "Low voltage": 3,
    "Flickering streetlight": 3,
    "Exposed wiring on pole": 3,
    "Stagnant water near habitation": 3,
    "Public toilet sanitation": 3,
}

# Template libraries for English, Hindi, and Hinglish across civic categories
TEMPLATES = {
    "Water outage": {
        "English": [
            "Water supply has been completely cut off in {loc} for {dur}. Residents are facing severe hardship.",
            "No municipal tap water in {loc} since {dur}. Kindly restore the supply immediately.",
            "Severe water shortage in {loc} area. Not a single drop of water since yesterday.",
            "Water supply stopped abruptly in {loc} without prior notice. Need urgent water tanker.",
        ],
        "Hindi": [
            "{loc} में {dur} से पानी की सप्लाई पूरी तरह बंद है। पीने के पानी के लिए भारी परेशानी हो रही है।",
            "{loc} क्षेत्र में नल में पानी नहीं आ रहा है {dur} से। कृपया तुरंत जल प्रदाय शुरू कराएं।",
            "पानी की भारी किल्लत {loc} में। बोरिंग और नल दोनों बंद हैं, बच्चे परेशान हो रहे हैं।",
            "{loc} में पिछले {dur} से पानी नहीं आया है, नगर निगम तुरंत टैंकर भिजवाए।",
        ],
        "Hinglish": [
            "{loc} me {dur} se paani nahi aa raha hai. Bahut dikkat ho rahi hai.",
            "Bhai {loc} side tap water completely band hai {dur} se. Please urgent help karo.",
            "{loc} area me water supply cut off hai {dur} se, sabhi log pareshan hain.",
            "{loc} me peene ka paani bilkul nahi aa raha {dur} se, please tanker send kijiye.",
        ],
    },
    "Low water pressure": {
        "English": [
            "Very low water pressure in {loc} for the past {dur}. Upper floors cannot fill tanks.",
            "Water trickle flow in {loc}. Motor cannot lift water to domestic rooftop tanks.",
        ],
        "Hindi": [
            "{loc} में {dur} से पानी का प्रेशर बहुत धीमा है। टंकी भरने में घंटों लग रहे हैं।",
            "{loc} क्षेत्र में नल से बहुत कम पानी आ रहा है, कृपया प्रेशर की जांच करवाएं।",
        ],
        "Hinglish": [
            "{loc} me paani ka pressure bahut slow hai {dur} se, tanki nahi bhar pa rahi.",
            "{loc} side trickle flow aa raha hai municipal line se, please check karo.",
        ],
    },
    "Water leakage": {
        "English": [
            "Major water pipeline burst on main road near {loc}. Thousands of liters wasting.",
            "Underground supply line leakage near {loc} market creating artificial puddle on road.",
        ],
        "Hindi": [
            "{loc} के पास मुख्य पाइपलाइन फूट गई है और हजारों लीटर साफ पानी सड़क पर बह रहा है।",
            "{loc} रोड पर जल प्रदाय लाइन में बड़ा लीकेज है, कृपया तुरंत मरम्मत करें।",
        ],
        "Hinglish": [
            "{loc} road pe main pipeline burst ho gayi hai, paani sadak pe beh raha hai.",
            "{loc} chourahe ke paas heavy water leakage ho rahi hai pipeline se, please fix it.",
        ],
    },
    "Contaminated water": {
        "English": [
            "Tap water in {loc} is muddy, yellow, and foul smelling. Unfit for drinking.",
            "Contaminated sewer water mixing with drinking supply in {loc}. Risk of cholera outbreak.",
        ],
        "Hindi": [
            "{loc} में नलों से बदबूदार और गंदा पीला पानी आ रहा है। यह पीने लायक बिल्कुल नहीं है।",
            "{loc} क्षेत्र में पीने के पानी में सीवेज का पानी मिल रहा है, लोग बीमार पड़ रहे हैं।",
        ],
        "Hinglish": [
            "{loc} me nalo se dirty aur smelly water aa raha hai {dur} se, peena impossible hai.",
            "{loc} area me contaminated water supply ho rahi hai, bimar hone ka darr hai.",
        ],
    },
    "Garbage accumulation": {
        "English": [
            "Huge heap of uncollected garbage near {loc} market. Foul smell is unbearable.",
            "Garbage dumped on {loc} roadside for {dur}. Stray cattle and dogs scattering waste.",
            "Open trash piled up near {loc} community park. Health hazard for children and elders.",
        ],
        "Hindi": [
            "{loc} के पास भारी मात्रा में कचरा जमा है। दुर्गंध के कारण वहां से निकलना मुश्किल हो गया है।",
            "{loc} चौराहे पर {dur} से कचरे का ढेर लगा है, आवारा मवेशी गंदगी फैला रहे हैं।",
            "{loc} में सफाई कर्मचारी कचरा नहीं उठा रहे हैं, चारों तरफ कूड़ा बिखरा पड़ा है।",
        ],
        "Hinglish": [
            "{loc} me bahut sara kachra jama ho gaya hai {dur} se, bohot gandi smell aa rahi hai.",
            "Bhai {loc} side roadside dumping badhti ja rahi hai, koi safai karne nahi aa raha.",
            "{loc} park ke paas trash pile up ho gaya hai, please Nagar Nigam vehicle bhejo.",
        ],
    },
    "Irregular garbage collection": {
        "English": [
            "Municipal door-to-door waste vehicle has not visited {loc} for {dur}.",
            "Garbage collection van skipping {loc} lanes regularly. Waste piling up in households.",
        ],
        "Hindi": [
            "{loc} में कचरा गाड़ी पिछले {dur} से नहीं आई है। घरों में कचरा इकट्ठा हो गया है।",
            "डोर-टू-डोर कचरा संग्रहण वाहन {loc} की गलियों में अनियमित रूप से आता है।",
        ],
        "Hinglish": [
            "{loc} me kachra gaadi {dur} se nahi aayi hai, gharo me kachra jama hai.",
            "Municipal dustbin van {loc} lane skip kar rahi hai regularly, please action lijiye.",
        ],
    },
    "Dead animal removal": {
        "English": [
            "Dead dog lying on the pavement near {loc}. Rotting carcass causing severe stench.",
            "Carcass of dead cattle on the road in {loc}. Please dispatch sanitation squad immediately.",
        ],
        "Hindi": [
            "{loc} में सड़क किनारे मृत जानवर पड़ा है। तीव्र दुर्गंध फैल रही है, कृपया तुरंत उठवाएं।",
            "{loc} मुख्य मार्ग पर मृत पशु पड़ा हुआ है, संक्रमण फैलने की आशंका है।",
        ],
        "Hinglish": [
            "{loc} road pe dead animal pada hua hai {dur} se, bahut badboo aa rahi hai, urgent remove karo.",
            "{loc} ke paas dead dog lying on road, please municipal sanitary team ko alert karo.",
        ],
    },
    "Open dumping": {
        "English": [
            "Illegal open dumping of commercial debris and plastics on vacant plot in {loc}.",
            "Tractor trolleys dumping building waste openly near {loc} residential area.",
        ],
        "Hindi": [
            "{loc} के खाली भूखंड पर अवैध रूप से कचरा और निर्माण सामग्री फेंकी जा रही है।",
            "{loc} आवासीय क्षेत्र के पास खुली डंपिंग हो रही है, पर्यावरण को नुकसान पहुंच रहा है।",
        ],
        "Hinglish": [
            "{loc} me open plot pe unauthorized dumping ho rahi hai roz raat ko.",
            "{loc} side vacant land par building malwa dump kiya ja raha hai.",
        ],
    },
    "Pothole": {
        "English": [
            "Dangerous potholes on {loc} main road. Multiple two-wheeler riders have fallen.",
            "Deep craters developed on {loc} road after rain. Major hazard for night commuters.",
            "Massive pothole near {loc} intersection causing traffic congestion and accidents.",
        ],
        "Hindi": [
            "{loc} मुख्य मार्ग पर जानलेवा गड्ढे हो गए हैं। कई बाइक सवार गिरकर चोटिल हो चुके हैं।",
            "{loc} चौराहे के पास सड़क में बड़े-बड़े गड्ढे हैं, रात में दुर्घटना का भारी खतरा है।",
            "{loc} रोड पर गड्ढों के कारण भयंकर ट्रैफिक जाम लग रहा है, तुरंत मरम्मत कराएं।",
        ],
        "Hinglish": [
            "{loc} main road pe bahut bade potholes ho gaye hain, do-wheelers roz phisal rahe hain.",
            "{loc} square ke paas deep pothole hai, night me visible nahi hota, accident prone hai.",
            "Bhai {loc} road ki halat kharab hai, gaddhe hi gaddhe hain, repair karwao please.",
        ],
    },
    "Road damage": {
        "English": [
            "Entire asphalt surface washed away near {loc}. Road broken into gravel and dust.",
            "Uneven cracked road stretch in {loc} causing vehicle suspension breakdown.",
        ],
        "Hindi": [
            "{loc} के पास पूरी सड़क उखड़ गई है और केवल गिट्टी और धूल उड़ रही है।",
            "{loc} क्षेत्र में सड़क धंस गई है, भारी वाहनों के चलने से खतरा बढ़ गया है।",
        ],
        "Hinglish": [
            "{loc} me road completely break ho chuki hai, sirf dust aur stones bache hain.",
            "{loc} side road sink ho gayi hai, gaadi chalana dangerous ho gaya hai.",
        ],
    },
    "Road obstruction": {
        "English": [
            "Fallen tree branch blocking one entire lane near {loc}. Traffic backed up.",
            "Construction material and sand dumped on the public road in {loc} blocking access.",
        ],
        "Hindi": [
            "{loc} में बड़ा पेड़ सड़क पर गिर गया है जिससे पूरा रास्ता बंद हो गया है।",
            "{loc} मुख्य मार्ग पर रेत और गिट्टी का ढेर लगाकर रास्ता रोक दिया गया है।",
        ],
        "Hinglish": [
            "{loc} main road par fallen tree branch ki wajah se heavy jam laga hai.",
            "{loc} ke raste me construction debris dump karke block kar diya hai.",
        ],
    },
    "Drain blockage": {
        "English": [
            "Storm drain choked with plastic and silt in {loc}. Dirty water overflowing onto road.",
            "Nullah blocked near {loc} causing artificial waterlogging during light rains.",
        ],
        "Hindi": [
            "{loc} में नाली कचरे और प्लास्टिक से चोक हो गई है। गंदा पानी सड़क पर बह रहा है।",
            "{loc} क्षेत्र में मुख्य नाला जाम होने से रिहायशी घरों के सामने जलभराव हो गया है।",
        ],
        "Hinglish": [
            "{loc} me drain blocked hai plastic ki wajah se, dirty water road pe overflow kar raha hai.",
            "{loc} side nullah jam hai {dur} se, barish me paani gharo ke andar ghus raha hai.",
        ],
    },
    "Overflowing sewage": {
        "English": [
            "Sewage chamber overflowing on {loc} residential street. Filthy black water spreading.",
            "Drainage backflow in {loc}. Unsanitary sewage entering house front yards.",
        ],
        "Hindi": [
            "{loc} की आवासीय सड़क पर सीवर का गंदा पानी उफन रहा है। भयंकर दुर्गंध और बीमारी का डर है।",
            "{loc} में सीवरेज लाइन जाम होने से गंदा पानी घरों के आगे भर गया है।",
        ],
        "Hinglish": [
            "{loc} residential lane me sewage overflow ho raha hai, filthy smell aur health hazard hai.",
            "{loc} me sewer line choked hai, black water sadak par fail gaya hai.",
        ],
    },
    "Damaged manhole cover": {
        "English": [
            "Missing manhole cover on main pedestrian path in {loc}. Critical fall hazard.",
            "Broken, sunken manhole lid in {loc}. Someone placed a tree branch as warning.",
        ],
        "Hindi": [
            "{loc} में पैदल मार्ग पर मैनहोल का ढक्कन टूटा हुआ है। कभी भी कोई बच्चा गिर सकता है।",
            "{loc} रोड पर खुला मैनहोल खुला पड़ा है, तत्काल नया ढक्कन लगवाया जाए।",
        ],
        "Hinglish": [
            "{loc} road pe open manhole cover hai, dangerous fall risk hai pedestrians ke liye.",
            "{loc} me broken manhole lid hai, accident hone se pehle cover fix karo please.",
        ],
    },
    "Streetlight not working": {
        "English": [
            "Streetlights on the entire stretch of {loc} are dark for {dur}. Safety hazard for women.",
            "Light pole fixture not functional in {loc}. Area completely pitch dark at night.",
        ],
        "Hindi": [
            "{loc} की पूरी सड़क पर पिछले {dur} से स्ट्रीट लाइट बंद है। रात में अंधेरा रहता है।",
            "{loc} क्षेत्र में खंभे की लाइट खराब है, असामाजिक तत्वों का जमावड़ा लग रहा है।",
        ],
        "Hinglish": [
            "{loc} me streetlights band hain {dur} se, raat ko poora dark ho jata hai, safety risk hai.",
            "{loc} lane me pole light on nahi ho rahi, please technician bhejiye.",
        ],
    },
    "Flickering streetlight": {
        "English": [
            "Streetlight opposite house in {loc} continuously flickering and humming loudly.",
            "Blinking sodium streetlight in {loc} causing disturbance and eye strain.",
        ],
        "Hindi": [
            "{loc} में स्ट्रीट लाइट लगातार झिलमिला रही है और तेज आवाज कर रही है।",
            "{loc} में खंभे का बल्ब लगातार ब्लिंक कर रहा है, कृपया बल्ब बदलें।",
        ],
        "Hinglish": [
            "{loc} me streetlight continuously flicker ho rahi hai, bulb fuse hone wala hai.",
            "{loc} pole light blinking problem {dur} se hai, kindly repair.",
        ],
    },
    "Exposed wiring on pole": {
        "English": [
            "Naked electrical wires hanging out from the base of streetlight pole in {loc}.",
            "Live electrical wires exposed on metal pole in {loc}. Risk of electrocution in rain.",
        ],
        "Hindi": [
            "{loc} में बिजली के खंभे से नंगे तार लटक रहे हैं। करंट लगने का गंभीर खतरा है।",
            "{loc} में स्ट्रीट लाइट पोल का जंक्शन बॉक्स खुला पड़ा है, बच्चे छू सकते हैं।",
        ],
        "Hinglish": [
            "{loc} me streetlight pole par open naked wires latak rahe hain, electrocution ka khatra hai.",
            "{loc} pole ke base pe live wires exposed hain, immediate action needed.",
        ],
    },
    "Power outage": {
        "English": [
            "Unscheduled power cut in {loc} for the past {dur}. Inverter battery discharged.",
            "Complete blackout in {loc} sector. No electricity since evening.",
        ],
        "Hindi": [
            "{loc} में पिछले {dur} से अघोषित बिजली कटौती है। भीषण गर्मी में लोग परेशान हैं।",
            "{loc} क्षेत्र में बिजली गुल है, ग्रिड या ट्रांसफार्मर में खराबी की आशंका है।",
        ],
        "Hinglish": [
            "{loc} me power cut chal raha hai {dur} se, fan light sab band hai, please light chalu karo.",
            "{loc} sector me complete blackout hai evening se, electricity board call pick nahi kar raha.",
        ],
    },
    "Low voltage": {
        "English": [
            "Extremely low voltage in {loc}. Refrigerators and water pumps cannot start.",
            "Severe voltage fluctuation in {loc} damaging home electronics and appliances.",
        ],
        "Hindi": [
            "{loc} में वोल्टेज बहुत कम आ रहा है। मोटर और फ्रिज नहीं चल पा रहे हैं।",
            "{loc} में वोल्टेज में भारी उतार-चढ़ाव से घरेलू उपकरण खराब होने का खतरा है।",
        ],
        "Hinglish": [
            "{loc} me low voltage issue hai {dur} se, tubelight blink ho rahi hai aur motor start nahi hoti.",
            "{loc} area me heavy voltage drop hai, appliances damage ho rahe hain.",
        ],
    },
    "Loose overhead wires": {
        "English": [
            "Overhead electricity cables sagging very low in {loc}, almost touching passing trucks.",
            "Loose power cable snapped and dangling dangerously near {loc} market.",
        ],
        "Hindi": [
            "{loc} में बिजली के तार काफी नीचे लटक रहे हैं, वाहनों से टकराने का अंदेशा है।",
            "{loc} बाजार के पास हाई टेंशन तार झूल रहा है, तुरंत कसा जाए।",
        ],
        "Hinglish": [
            "{loc} me overhead power cables dangerous height par latak rahe hain, truck se takra sakte hain.",
            "{loc} side loose electrical wire zameen ke paas aa gaya hai, please fix it.",
        ],
    },
    "Mosquito breeding / fogging request": {
        "English": [
            "Severe mosquito menace in {loc}. Urgent need for anti-larval fogging spray.",
            "Dengue and malaria cases rising in {loc} due to rampant mosquito breeding.",
        ],
        "Hindi": [
            "{loc} में मच्छरों का भारी प्रकोप है। नगर निगम तुरंत फागिंग मशीन भिजवाए।",
            "{loc} क्षेत्र में डेंगू का खतरा बढ़ रहा है, कीटनाशक छिड़काव कराया जाए।",
        ],
        "Hinglish": [
            "{loc} me machhar bohot badh gaye hain, malaria dengue ka fear hai, please fogging karwa do.",
            "{loc} area me mosquito breeding ho rahi hai, municipal team ko spray ke liye bolo.",
        ],
    },
    "Stray dog menace": {
        "English": [
            "Pack of aggressive stray dogs chasing pedestrians and cyclists in {loc}.",
            "Multiple dog bite incidents in {loc} this week. Urgent municipal dog catching required.",
        ],
        "Hindi": [
            "{loc} में आवारा कुत्तों का आतंक है। रात में पैदल निकलने वालों पर हमला कर रहे हैं।",
            "{loc} क्षेत्र में कई बच्चों को कुत्तों ने काटा है, तुरंत डॉग स्क्वाड भेजा जाए।",
        ],
        "Hinglish": [
            "{loc} me stray dogs ka pack aggressive ho gaya hai, bike riders ke peeche daudte hain.",
            "{loc} gali me dogs ne 2 logo ko bite kiya hai, please dog catching vehicle bhejiye.",
        ],
    },
    "Stagnant water near habitation": {
        "English": [
            "Stagnant pool of green dirty water near {loc} residential plots breeding pests.",
            "Waterlogged vacant plot in {loc} emitting foul odor and breeding vector mosquitoes.",
        ],
        "Hindi": [
            "{loc} में आवासीय बस्ती के पास गंदा पानी जमा है। बदबू और मच्छरों से लोग परेशान हैं।",
            "{loc} के खाली मैदान में ठहरा हुआ पानी सड़ रहा है, पानी की निकासी कराई जाए।",
        ],
        "Hinglish": [
            "{loc} me residential plots ke samne stagnant water jama hai {dur} se, bimari fail rahi hai.",
            "{loc} side ganda paani bhara hua hai ground me, drainage se pump out karo.",
        ],
    },
    "Public toilet sanitation": {
        "English": [
            "Municipal public toilet in {loc} is choked, without water, and filthy. Unusable.",
            "Foul smell spreading from dilapidated public convenience block near {loc} bus stand.",
        ],
        "Hindi": [
            "{loc} में सार्वजनिक शौचालय में गंदगी का अंबार है और पानी की कोई व्यवस्था नहीं है।",
            "{loc} बस स्टैंड के पास सुलभ शौचालय बंद और बदहाल पड़ा है, तुरंत सफाई कराई जाए।",
        ],
        "Hinglish": [
            "{loc} market me public toilet bilkul clean nahi hai, paani bhi nahi hai, unusable condition hai.",
            "{loc} toilet complex me choke ho gaya hai, bahut badboo aa rahi hai.",
        ],
    },
}

DURATIONS = {
    "English": ["2 days", "3 days", "4 days", "one week", "yesterday", "5 days", "10 days"],
    "Hindi": ["2 दिन", "3 दिन", "4 दिन", "एक हफ्ते", "कल", "5 दिन", "एक महीने"],
    "Hinglish": ["2 din", "3 din", "4 din", "1 week", "kal", "5 din", "ek hafte"],
}


def load_configs():
    with open(CONFIG_DIR / "departments.json", "r", encoding="utf-8") as f:
        depts_data = json.load(f)["departments"]
    with open(CONFIG_DIR / "categories.json", "r", encoding="utf-8") as f:
        cats_data = json.load(f)["categories"]
    with open(CONFIG_DIR / "localities.json", "r", encoding="utf-8") as f:
        locs_data = json.load(f)["localities"]

    cat_to_dept = {c["name"]: c["department"] for c in cats_data}
    cat_to_urgency = {c["name"]: c["default_urgency"] for c in cats_data}
    loc_to_ward = {l["name"]: l["ward"] for l in locs_data}
    loc_to_aliases = {l["name"]: l["aliases"] for l in locs_data}

    return depts_data, cat_to_dept, cat_to_urgency, loc_to_ward, loc_to_aliases


def choose_channel():
    channels, weights = zip(*CHANNELS)
    return random.choices(channels, weights=weights, k=1)[0]


def render_text(category: str, locality_name: str, aliases: list[str], language: str) -> str:
    templates = TEMPLATES.get(category, {}).get(language)
    if not templates:
        templates = [f"Issue reported in {{loc}} regarding {category} for {{dur}}."]
    template = random.choice(templates)

    loc_display = locality_name
    if aliases and random.random() < 0.5:
        if language == "Hindi":
            hindi_aliases = [a for a in aliases if any('\u0900' <= char <= '\u097f' for char in a)]
            loc_display = random.choice(hindi_aliases) if hindi_aliases else random.choice(aliases)
        else:
            loc_display = random.choice(aliases)

    dur = random.choice(DURATIONS.get(language, DURATIONS["English"]))
    return template.format(loc=loc_display, dur=dur)


def build_complaint(
    cid: str,
    incident_id: str,
    category: str,
    cat_to_dept: dict,
    cat_to_urgency: dict,
    locality_name: str,
    ward: str,
    aliases: list[str],
    language: str,
    base_time: datetime,
    is_resolved: bool,
    is_pending: bool,
) -> ComplaintRecord:
    dept = cat_to_dept[category]
    urgency = cat_to_urgency[category]
    channel = choose_channel()
    raw_text = render_text(category, locality_name, aliases, language)

    # Status resolution logic
    if is_resolved:
        status = "Resolved"
        resolved_hours = random.randint(3, 120)  # resolved between 3h to 5 days later
        resolved_at = base_time + timedelta(hours=resolved_hours)
    elif is_pending:
        status = "Pending"
        resolved_at = None
    else:
        status = "In Progress"
        resolved_at = None

    return ComplaintRecord(
        complaint_id=cid,
        source_channel=channel,
        timestamp=base_time,
        raw_text=raw_text,
        language_ground_truth=language,
        department_ground_truth=dept,
        category_ground_truth=category,
        locality_ground_truth=locality_name,
        ward_ground_truth=ward,
        urgency_ground_truth=urgency,
        incident_id=incident_id,
        status=status,
        resolved_at=resolved_at,
    )


def write_csv(records: list[ComplaintRecord], path: Path):
    fieldnames = [
        "complaint_id",
        "source_channel",
        "timestamp",
        "raw_text",
        "language_ground_truth",
        "department_ground_truth",
        "category_ground_truth",
        "locality_ground_truth",
        "ward_ground_truth",
        "urgency_ground_truth",
        "incident_id",
        "status",
        "resolved_at",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow({
                "complaint_id": r.complaint_id,
                "source_channel": r.source_channel,
                "timestamp": r.timestamp.isoformat(),
                "raw_text": r.raw_text,
                "language_ground_truth": r.language_ground_truth,
                "department_ground_truth": r.department_ground_truth,
                "category_ground_truth": r.category_ground_truth,
                "locality_ground_truth": r.locality_ground_truth or "",
                "ward_ground_truth": r.ward_ground_truth or "",
                "urgency_ground_truth": r.urgency_ground_truth,
                "incident_id": r.incident_id,
                "status": r.status,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else "",
            })


def generate():
    random.seed(RANDOM_SEED)

    depts_data, cat_to_dept, cat_to_urgency, loc_to_ward, loc_to_aliases = load_configs()
    localities = list(loc_to_ward.keys())
    categories = list(CATEGORY_WEIGHTS.keys())
    cat_weights = [CATEGORY_WEIGHTS[c] for c in categories]

    languages = ["English", "Hindi", "Hinglish"]
    lang_weights = [0.34, 0.33, 0.33]

    start_date = datetime(2026, 6, 1, 8, 0, 0)

    train_records: list[ComplaintRecord] = []
    test_records: list[ComplaintRecord] = []

    complaint_counter = 1
    incident_counter = 1

    # 1. DUPLICATE INCIDENTS
    duplicate_group_sizes = [12, 10, 8, 8, 7, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3]
    for grp_size in duplicate_group_sizes:
        inc_id = f"INC-{incident_counter:04d}"
        incident_counter += 1

        cat = random.choices(categories, weights=cat_weights, k=1)[0]
        loc = random.choice(localities)
        ward = loc_to_ward[loc]
        aliases = loc_to_aliases[loc]

        inc_time = start_date + timedelta(days=random.randint(0, 95), hours=random.randint(6, 20))
        is_resolved_inc = random.random() < 0.7
        is_pending_inc = (not is_resolved_inc) and (random.random() < 0.5)

        for _ in range(grp_size):
            cid = f"CMP-{complaint_counter:04d}"
            complaint_counter += 1
            lang = random.choices(languages, weights=lang_weights, k=1)[0]
            comp_time = inc_time + timedelta(hours=random.randint(0, 48), minutes=random.randint(0, 59))

            rec = build_complaint(
                cid=cid,
                incident_id=inc_id,
                category=cat,
                cat_to_dept=cat_to_dept,
                cat_to_urgency=cat_to_urgency,
                locality_name=loc,
                ward=ward,
                aliases=aliases,
                language=lang,
                base_time=comp_time,
                is_resolved=is_resolved_inc,
                is_pending=is_pending_inc,
            )
            train_records.append(rec)

    # 2. REPEAT COMPLAINTS (Recurring problem across months, distinct incident_ids)
    repeat_scenarios = [
        ("Water outage", "Kolar"),
        ("Garbage accumulation", "MP Nagar"),
        ("Drain blockage", "Karond"),
        ("Pothole", "Hoshangabad Road"),
        ("Streetlight not working", "Shahpura"),
        ("Power outage", "Bairagarh"),
        ("Mosquito breeding / fogging request", "Ashoka Garden"),
        ("Overflowing sewage", "Jahangirabad"),
    ]

    for cat, loc in repeat_scenarios:
        ward = loc_to_ward[loc]
        aliases = loc_to_aliases[loc]
        for base_month in [6, 7, 8, 9]:
            inc_id = f"INC-{incident_counter:04d}"
            incident_counter += 1

            repeat_time = datetime(2026, base_month, random.randint(3, 25), random.randint(8, 18))
            is_resolved = base_month < 9
            is_pending = base_month == 9 and random.random() < 0.5

            for _ in range(random.randint(2, 4)):
                cid = f"CMP-{complaint_counter:04d}"
                complaint_counter += 1
                lang = random.choices(languages, weights=lang_weights, k=1)[0]
                comp_time = repeat_time + timedelta(hours=random.randint(0, 36))

                rec = build_complaint(
                    cid=cid,
                    incident_id=inc_id,
                    category=cat,
                    cat_to_dept=cat_to_dept,
                    cat_to_urgency=cat_to_urgency,
                    locality_name=loc,
                    ward=ward,
                    aliases=aliases,
                    language=lang,
                    base_time=comp_time,
                    is_resolved=is_resolved,
                    is_pending=is_pending,
                )
                train_records.append(rec)

    # 3. INDEPENDENT CIVIC COMPLAINTS (Fill out to 750 total)
    target_train_count = 750
    while len(train_records) < target_train_count:
        inc_id = f"INC-{incident_counter:04d}"
        incident_counter += 1

        cat = random.choices(categories, weights=cat_weights, k=1)[0]
        loc = random.choice(localities)
        ward = loc_to_ward[loc]
        aliases = loc_to_aliases[loc]
        lang = random.choices(languages, weights=lang_weights, k=1)[0]

        comp_time = start_date + timedelta(days=random.randint(0, 100), hours=random.randint(6, 22))
        is_resolved = random.random() < 0.50
        is_pending = (not is_resolved) and (random.random() < 0.50)

        cid = f"CMP-{complaint_counter:04d}"
        complaint_counter += 1

        rec = build_complaint(
            cid=cid,
            incident_id=inc_id,
            category=cat,
            cat_to_dept=cat_to_dept,
            cat_to_urgency=cat_to_urgency,
            locality_name=loc,
            ward=ward,
            aliases=aliases,
            language=lang,
            base_time=comp_time,
            is_resolved=is_resolved,
            is_pending=is_pending,
        )
        train_records.append(rec)

    train_records.sort(key=lambda r: r.timestamp)

    # 4. HELD-OUT TEST DATASET (Target: 100 complaints)
    test_incident_counter = 1
    test_target_count = 100
    for t_idx in range(1, test_target_count + 1):
        cid = f"CMP-T{t_idx:04d}"
        if t_idx % 4 == 0 and t_idx > 1:
            inc_id = f"INC-T{test_incident_counter - 1:04d}"
        else:
            inc_id = f"INC-T{test_incident_counter:04d}"
            test_incident_counter += 1

        cat = random.choices(categories, weights=cat_weights, k=1)[0]
        loc = random.choice(localities)
        ward = loc_to_ward[loc]
        aliases = loc_to_aliases[loc]
        lang = random.choices(languages, weights=lang_weights, k=1)[0]

        comp_time = datetime(2026, 9, 1, 9, 0) + timedelta(days=random.randint(0, 13), hours=random.randint(0, 12))
        is_resolved = random.random() < 0.3
        is_pending = (not is_resolved) and (random.random() < 0.6)

        rec = build_complaint(
            cid=cid,
            incident_id=inc_id,
            category=cat,
            cat_to_dept=cat_to_dept,
            cat_to_urgency=cat_to_urgency,
            locality_name=loc,
            ward=ward,
            aliases=aliases,
            language=lang,
            base_time=comp_time,
            is_resolved=is_resolved,
            is_pending=is_pending,
        )
        test_records.append(rec)

    test_records.sort(key=lambda r: r.timestamp)

    # Output directories
    (DATA_DIR / "raw").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "processed").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "test").mkdir(parents=True, exist_ok=True)

    raw_path = DATA_DIR / "raw" / "complaints_raw.csv"
    processed_path = DATA_DIR / "processed" / "complaints.csv"
    test_path = DATA_DIR / "test" / "complaints_test.csv"

    write_csv(train_records, raw_path)
    write_csv(train_records, processed_path)
    write_csv(test_records, test_path)

    print(f"Generated {len(train_records)} training/demo complaints -> {raw_path} and {processed_path}")
    print(f"Generated {len(test_records)} held-out test complaints -> {test_path}")


if __name__ == "__main__":
    generate()
