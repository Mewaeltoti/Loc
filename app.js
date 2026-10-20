(() => {
  const button = document.getElementById("share");
  const consent = document.getElementById("consent");
  const status = document.getElementById("status");

  function say(message) {
    status.textContent = message;
  }

  function configIsReady() {
    const cfg = window.APP_CONFIG || {};
    return cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes("YOUR-PROJECT-REF") &&
      !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  }

  button.addEventListener("click", async () => {
    if (!consent.checked) {
      say("Please check the consent box first, or leave without sharing.");
      consent.focus();
      return;
    }

    if (!configIsReady()) {
      say("Setup is not complete yet. Add your Supabase URL and public key to config.js.");
      return;
    }

    if (!window.supabase?.createClient) {
      say("The database client did not load. Check your internet connection and try again.");
      return;
    }

    if (!navigator.geolocation) {
      say("This browser does not support location sharing.");
      return;
    }

    button.disabled = true;
    say("Waiting for your browser's location permission…");

    navigator.geolocation.getCurrentPosition(async (position) => {
      const cfg = window.APP_CONFIG;
      const client = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );

      const record = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy,
        consented: true
      };

      say("Permission granted. Saving the location you agreed to share…");
      try {
        const { error } = await client
          .from("location_shares")
          .insert(record);

        if (error) {
          console.error("Supabase insert failed:", error);
          say("Your location was not saved. Please check the setup or try again later.");
          return;
        }
        say("Thank you. Your location was saved successfully.");
      } catch (err) {
        console.error(err);
        say("Something went wrong. Your location may not have been saved.");
      } finally {
        button.disabled = false;
      }
    }, (error) => {
      if (error.code === 1) {
        say("Location permission was declined. No GPS coordinates were submitted.");
      } else if (error.code === 2) {
        say("Your location is unavailable. Check your device location settings and try again.");
      } else if (error.code === 3) {
        say("The location request timed out. Please try again.");
      } else {
        say("Could not obtain your location. No coordinates were submitted.");
      }
      button.disabled = false;
    }, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    });
  });
})();
