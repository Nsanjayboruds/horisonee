import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  Moon,
  Smile,
  Frown,
  Meh,
  Zap,
  Coffee,
  Dumbbell,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  HeartPulse,
  ClipboardList,
  BookOpen,
  Droplet,
  Handshake,
  Utensils,
} from "lucide-react";
import axios from "axios";
import { PrivacyForm } from "./PrivacyForm";
import { useAuth, useUser } from "@clerk/clerk-react";
import SideBar from "./SideBar";
import useScreenSize from "../hooks/useScreenSize";

// Try multiple server URLs in case one is down
const render_url = "https://Herizon.onrender.com/";
const server_url = import.meta.env.VITE_SERVER_URL || render_url;
const local_url = "http://localhost:3000/";

export function Dashboard() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { width } = useScreenSize();
  const navigate = useNavigate();

  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [isSignedIn, navigate]);

  const [waterIntake, setWaterIntake] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showMythModal, setShowMythModal] = useState(false);
  const [currentMyth, setCurrentMyth] = useState(null);
  const [periodData, setPeriodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedData, setSelectedData] = useState({
    cycleInfo: true,
    moodData: true,
    sleepData: true,
    symptomsData: true,
    wellnessData: true,
  });
  const [showPrivacyForm, setShowPrivacyForm] = useState(false);

  const fallbackData = {
    cycleDuration: 28,
    lastPeriodStart: new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000
    ).toISOString(),
    lastPeriodDuration: 5,
    moodTypes: ["Happy", "Anxious", "Irritable"],
    moodSeverity: "Moderate",
    moodDate: new Date().toISOString(),
    symptoms: ["Cramps", "Bloating", "Headache"],
    symptomSeverities: {
      Cramps: "Severe",
      Bloating: "Moderate",
      Headache: "Mild",
    },
    symptomDate: new Date().toISOString(),
    sleepDuration: 7.5,
    sleepQuality: "Good",
    nextPeriodPrediction: new Date(
      Date.now() + 13 * 24 * 60 * 60 * 1000
    ).toISOString(),
    currentPhase: "Luteal",
  };

  const fetchPeriodData = async () => {
    if (!isSignedIn || !user) {
      setError("You must be signed in to view this page.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = user.id;

    const fetchWithTimeout = async (url, timeout) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const token = await user.getToken();
        console.log("Using auth token for request to", url);
        console.log(`Timeout set to ${timeout}ms`);

        const response = await axios.get(
          `${url}api/period/periodtracking/${userId}`,
          {
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            timeout: timeout,
          }
        );
        clearTimeout(id);
        console.log(
          `Request to ${url} completed successfully in less than ${timeout}ms`
        );
        return response.data;
      } catch (error) {
        clearTimeout(id);

        if (error.name === "AbortError" || error.code === "ECONNABORTED") {
          console.error(`Request to ${url} timed out after ${timeout}ms`);
          throw new Error(`Request to ${url} timed out after ${timeout}ms`);
        }

        if (error.response && error.response.status === 401) {
          console.log(`Authentication error - 401 Unauthorized for ${url}`);
          throw new Error("Authentication failed. Please sign in again.");
        }

        if (error.code === "ERR_BAD_REQUEST") {
          console.log(`Bad request error for ${url}`, error.response?.status);
          navigate("/tracker");
          throw new Error("Period Data not found");
        }

        if (error.code === "ERR_NETWORK") {
          console.error(`Network error connecting to ${url}: ${error.message}`);
          throw new Error(
            `Network error connecting to ${url}. Please check your internet connection.`
          );
        }

        console.error(
          `Request error for ${url}:`,
          error.code,
          error.message,
          error.response?.status
        );
        throw error;
      }
    };

    try {
      console.log("Attempting to fetch data from server URL:", server_url);
      const data = await fetchWithTimeout(server_url, 8000);
      console.log("Server data received:", data);
      setPeriodData(data.periodTrackingData);
      setWaterIntake(data.periodTrackingData.waterIntakeCount || 0);
      setError(null);
    } catch (serverError) {
      console.error("Error fetching from server:", serverError);
      console.log("Server error details:", serverError.message, serverError.code);

      if (server_url !== render_url) {
        try {
          console.log("Attempting to fetch data from render URL:", render_url);
          const data = await fetchWithTimeout(render_url, 30000);
          console.log("Render data received:", data);
          setPeriodData(data.periodTrackingData);
          setWaterIntake(data.periodTrackingData.waterIntakeCount || 0);
          setError(null);
          return;
        } catch (renderError) {
          console.error("Error fetching from render:", renderError);
          console.log("Render error details:", renderError.message, renderError.code);
        }
      }

      try {
        console.log("Attempting to fetch data from local URL:", local_url);
        const data = await fetchWithTimeout(local_url, 5000);
        console.log("Local data received:", data);
        setPeriodData(data.periodTrackingData);
        setWaterIntake(data.periodTrackingData.waterIntakeCount || 0);
        setError("Using local data due to server unavailability.");
      } catch (localError) {
        console.error("Error fetching from local:", localError);
        console.log("Local error details:", localError.message, localError.code);
        console.log("Using fallback data");
        setPeriodData(fallbackData);

        if (
          serverError.message.includes("Authentication failed") ||
          (renderError && renderError.message.includes("Authentication failed")) ||
          localError.message.includes("Authentication failed")
        ) {
          setError("Authentication failed. Please sign in again.");
        } else if (
          serverError.message.includes("timeout") ||
          (renderError && renderError.message.includes("timeout")) ||
          localError.message.includes("timeout")
        ) {
          setError(
            `Unable to connect to the server (${server_url}, ${render_url} or ${local_url}). Connection timed out. Using sample data for demonstration purposes. Please check your internet connection and try again later.`
          );
        } else {
          setError(
            `Unable to connect to the server (${server_url}, ${render_url} or ${local_url}). Using sample data for demonstration purposes. Please check your internet connection and try again later.`
          );
        }
        setWaterIntake(0);

        setError(
          `Unable to connect to the server (${server_url} or ${local_url}). Using sample data for demonstration purposes. Please check your internet connection and try again later.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodData();
  }, [isSignedIn, user, server_url, local_url, navigate]);

  useEffect(() => {
    const notificationInterval = setInterval(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }, 30000);
    return () => clearInterval(notificationInterval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarVisible(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleWaterIntake = async () => {
    if (!isSignedIn || !user) return;

    if (waterIntake < 8) {
      setWaterIntake((prev) => Math.min(prev + 1, 8));
      try {
        const token = await user.getToken();
        const response = await axios.get(
          `${server_url}api/period/waterupdate/${user.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
          }
        );
        console.log("Water intake logged:", response);
      } catch (error) {
        console.error("Error updating water intake:", error);
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const toggleDataSelection = (dataType) => {
    setSelectedData((prev) => ({
      ...prev,
      [dataType]: !prev[dataType],
    }));
  };

  const handleSavePrivacySettings = (settings) => {
    console.log("Privacy settings saved:", settings);

    setShowPrivacyForm(false);
  };

  const sendSOSEmails = async () => {
    const formspreeEndpoints = [
      "https://formspree.io/f/mjkooylp",
      "https://formspree.io/f/mzzvveon",
      "https://formspree.io/f/meozzadj",
    ];

    const emailBody = {
      subject: "SOS Alert",
      message: `This is an SOS alert generated by ${
        user?.fullName || "a user"
      } from the Herizon app.`,
    };

    try {
      const promises = formspreeEndpoints.map((endpoint) =>
        fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailBody),
        })
      );

      await Promise.all(promises);
      alert("SOS alerts sent successfully!");
    } catch (error) {
      console.error("Error sending SOS alerts:", error);
      alert("Failed to send SOS alerts. Please try again.");
    }
  };

  const myths = [
    {
      myth: "You can't get pregnant during your period.",
      fact: "While it's less likely, you can still get pregnant during your period, especially if you have a shorter menstrual cycle.",
    },
    {
      myth: "PMS is all in your head.",
      fact: "PMS is a real medical condition caused by hormonal changes during the menstrual cycle.",
    },
    {
      myth: "Irregular periods always indicate a serious problem.",
      fact: "While irregular periods can sometimes signal health issues, they can also be caused by stress, diet, or exercise changes.",
    },
    {
      myth: "You shouldn't exercise during your period.",
      fact: "Exercise can actually help alleviate period symptoms like cramps and mood swings.",
    },
    {
      myth: "Using tampons can cause you to lose your virginity.",
      fact: "Using tampons does not affect virginity, which is about sexual intercourse, not physical changes to the body.",
    },
  ];

  const openMythModal = (myth) => {
    setCurrentMyth(myth);
    setShowMythModal(true);
  };

  // --- UI/UX Redesign ---
  if (!isSignedIn)
    return (
      <div className="flex items-center justify-center h-screen text-2xl">
        Sign in Required
      </div>
    );
  if (!user)
    return (
      <div className="flex items-center justify-center h-screen text-2xl">
        Loading...
      </div>
    );

  if (loading) {
    return <div>Fetching your Data...</div>;
  }

  if (!periodData) {
    return <div>No period data found. Please complete your profile.</div>;
  }

  const cycleDay =
    (Math.floor(
      (new Date() - new Date(periodData.lastPeriodStart)) /
        (1000 * 60 * 60 * 24)
    ) % periodData.cycleDuration) + 1;
  const daysUntilNextPeriod = periodData.cycleDuration - cycleDay;
  const fertileWindow = cycleDay >= 11 && cycleDay <= 17;
  const pmsLikely = periodData.currentPhase === "Luteal" && cycleDay > 21;
  const wellRested =
    periodData.sleepQuality === "Good" && periodData.sleepDuration >= 7;

  const getHealthTips = () => {
    const tips = [
      "Stay hydrated! Aim for 8 glasses of water a day.",
      "Practice deep breathing exercises for stress relief.",
      "Incorporate more leafy greens into your diet for iron.",
      "Try a warm compress for cramp relief.",
      "Get moving with light exercise like yoga or walking.",
    ];
    return tips.slice(0, 3);
  };

  const healthTips = getHealthTips();

  // --- Modern Dashboard Layout ---
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      {/* Sidebar/Profile */}
      <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col justify-between py-8 px-6">
        <div>
          <div className="flex flex-col items-center mb-8">
            <img
              src={user.imageUrl || "/images/women.jpeg"}
              alt="Profile"
              className="h-20 w-20 rounded-full border-4 border-pink-400 shadow-lg"
            />
            <h2 className="mt-4 text-xl font-bold text-pink-700 dark:text-pink-300">
              {user.fullName || "User"}
            </h2>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {user.emailAddress}
            </span>
          </div>
          <nav className="space-y-2">
            <SidebarNavButton
              icon={<HeartPulse />}
              label="Cycle Overview"
              active
            />
            <SidebarNavButton icon={<ClipboardList />} label="Insights" />
            <SidebarNavButton icon={<BookOpen />} label="MythBusters" />
            <SidebarNavButton icon={<Droplet />} label="Water Tracker" />
            <SidebarNavButton icon={<Handshake />} label="Wellness" />
          </nav>
        </div>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition">
            <Bell /> Notifications
          </button>
          <button
            onClick={() => setShowPrivacyForm((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {showPrivacyForm ? <Unlock /> : <Lock />} Privacy Settings
          </button>
          <button
            onClick={sendSOSEmails}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          >
            <AlertTriangle /> SOS Alert
          </button>
        </div>
      </aside>

      {/* Main Dashboard */}
      <main className="flex-1 flex flex-col px-10 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pink-700 dark:text-pink-300">
              Welcome, {user.firstName || "User"}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's your personalized health dashboard.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full bg-pink-100 text-pink-700 hover:bg-pink-200">
              <Bell />
            </button>
            <img
              src={user.imageUrl || "/images/women.jpeg"}
              alt="Profile"
              className="h-10 w-10 rounded-full border-2 border-pink-400"
            />
          </div>
        </header>

        {/* Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Cycle Day"
            value={cycleDay}
            icon={<HeartPulse className="h-8 w-8 text-pink-500" />}
            subtitle={`Current Phase: ${periodData.currentPhase}`}
          />
          <StatCard
            title="Mood"
            value={periodData.moodTypes[0]}
            icon={getMoodIcon(periodData.moodTypes[0])}
            subtitle={`Severity: ${periodData.moodSeverity}`}
          />
          <StatCard
            title="Sleep"
            value={`${periodData.sleepDuration} hrs`}
            icon={<Moon className="h-8 w-8 text-purple-500" />}
            subtitle={`Quality: ${periodData.sleepQuality}`}
          />
        </section>

        {/* Main Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Left: Health Tips & Water Tracker */}
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">
                Daily Health Tips
              </h3>
              <ul className="space-y-2">
                {getHealthTips().map((tip, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-pink-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">Water Intake</h3>
              <div className="flex items-center justify-between mb-2">
                <span>Goal: 8 glasses</span>
                <span>{waterIntake} / 8</span>
              </div>
              <div className="h-3 bg-pink-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${(waterIntake / 8) * 100}%` }}
                ></div>
              </div>
              <button
                onClick={handleWaterIntake}
                className="w-full py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition"
              >
                Log Water Intake
              </button>
            </Card>
          </div>

          {/* Center: Cycle Progress & Events */}
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">Cycle Progress</h3>
              <div className="mb-2 text-lg font-bold">
                Day {cycleDay} of {periodData.cycleDuration}
              </div>
              <div className="w-full h-4 bg-pink-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${(cycleDay / periodData.cycleDuration) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  Last Period:{" "}
                  {new Date(periodData.lastPeriodStart).toLocaleDateString()}
                </span>
                <span>Next: {daysUntilNextPeriod} days</span>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">Upcoming Events</h3>
              <ul className="space-y-3">
                <EventItem title="Doctor's Appointment" date="Tomorrow, 10:00 AM" />
                <EventItem title="Yoga Class" date="Wednesday, 6:00 PM" />
                <EventItem
                  title="Period Start Date"
                  date={`In ${daysUntilNextPeriod} days`}
                />
              </ul>
            </Card>
          </div>

          {/* Right: Wellness & Insights */}
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">Wellness Tracker</h3>
              <div className="grid grid-cols-1 gap-3">
                <WellnessItem
                  title="Energy"
                  value={periodData.moodSeverity}
                  icon={<Zap className="h-5 w-5" />}
                />
                <WellnessItem
                  title="Stress"
                  value={
                    periodData.moodSeverity === "Moderate" ? "Low" : "Moderate"
                  }
                  icon={<Coffee className="h-5 w-5" />}
                />
                <WellnessItem title="Exercise" value="30 min" icon={<Dumbbell className="h-5 w-5" />} />
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-4 text-pink-600">Insights</h3>
              <InsightItem
                title="Fertility Window"
                value={
                  cycleDay >= 11 && cycleDay <= 17 ? "Active" : "Inactive"
                }
                icon={<Calendar className="h-5 w-5 text-pink-400" />}
              />
              <InsightItem
                title="PMS Likelihood"
                value={
                  periodData.currentPhase === "Luteal" && cycleDay > 21
                    ? "High"
                    : "Low"
                }
                icon={<ClipboardList className="h-5 w-5 text-pink-400" />}
              />
              <InsightItem
                title="Rest Status"
                value={
                  periodData.sleepQuality === "Good" && periodData.sleepDuration >= 7
                    ? "Well Rested"
                    : "Need More Rest"
                }
                icon={<Moon className="h-5 w-5 text-pink-400" />}
              />
            </Card>
          </div>
        </section>

        {/* Privacy Form Modal */}
        {showPrivacyForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-xl w-full max-w-lg">
              <PrivacyForm onSave={handleSavePrivacySettings} />
              <button
                onClick={() => setShowPrivacyForm(false)}
                className="mt-4 w-full py-2 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Helper Components for New Layout ---
const SidebarNavButton = ({ icon, label, active }) => (
  <button className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg font-semibold transition ${active ? "bg-pink-100 text-pink-700" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"}`}>
    {icon}
    {label}
  </button>
);

const StatCard = ({ title, value, icon, subtitle }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col items-center justify-center">
    <div className="mb-2">{icon}</div>
    <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{value}</div>
    <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
    {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
  </div>
);

const Card = ({ children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">{children}</div>
);

const WellnessItem = ({ title, value, icon }) => (
  <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-gray-800 rounded-lg">
    <div className="p-2 bg-pink-100 dark:bg-gray-700 rounded-full">{icon}</div>
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="font-medium">{value}</div>
    </div>
  </div>
);

const InsightItem = ({ title, value, icon }) => (
  <div className="flex items-center gap-3 mb-2">
    {icon}
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="font-medium">{value}</div>
    </div>
  </div>
);

const EventItem = ({ title, date }) => (
  <li className="flex items-center gap-3">
    <Calendar className="h-5 w-5 text-pink-400" />
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-400">{date}</div>
    </div>
  </li>
);

const getMoodIcon = (mood) => {
  if (typeof mood == "string") {
    switch (mood.toLowerCase()) {
      case "happy":
        return <Smile className="h-8 w-8 text-green-500" />;
      case "sad":
        return <Frown className="h-8 w-8 text-blue-500" />;
      default:
        return <Meh className="h-8 w-8 text-yellow-500" />;
    }
  }
};
