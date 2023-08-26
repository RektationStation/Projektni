//file script.js
var countryDetailsElement = document.getElementById("country-details");
var searchInput = document.getElementById("search-input");
var errorElement = document.getElementById("error-message");
var map = null; // Initialize map as null
  // Initialize Firebase
  var firebaseConfig = {
    apiKey: "AIzaSyC0k7eqIpoBhhF16qcy6meEUOA-W8a2WDk",
    authDomain: "zemlje-svijeta.firebaseapp.com",
    databaseURL: "https://zemlje-svijeta-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "zemlje-svijeta",
    storageBucket: "zemlje-svijeta.appspot.com",
    messagingSenderId: "248763131292",
    appId: "1:248763131292:web:1cbd4f64e53de257101459",
    measurementId: "G-E2PR69J75H"
  };
  firebase.initializeApp(firebaseConfig);

var usStatesData;

const database = firebase.database();
const ref = database.ref('us-states-data');
const favoritesRef = database.ref('favorites');

ref.once('value')
  .then(snapshot => {
    // Access the data snapshot
    const data = snapshot.val();
    usStatesData = data;

    console.log("Data loaded:", usStatesData);

    // Call the search function or any other dependent code here
    searchCountryOrState();
  })
  .catch(error => {
    console.error('Error:', error);
  });

// Firebase Authentication event listener
firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    // User is logged in
    currentUser = user;
    favoritesRef.child(currentUser.uid).on('value', snapshot => {
      const favorites = snapshot.val();
      console.log("Favorites loaded:", favorites);
      renderFavorites(favorites);
    });

    // Show the content
    document.getElementById("content").style.display = "block";
    document.getElementById("login-container").style.display = "none";
    document.getElementById("register-container").style.display = "none";
    document.getElementById("view-favorites-btn").style.display = "block"; // Show the "View Favorites Map" button
  } else {
    // User is not logged in
    currentUser = null;

    // Show the login container
    document.getElementById("login-container").style.display = "block";
    document.getElementById("register-container").style.display = "none";
    document.getElementById("content").style.display = "none";
    document.getElementById("view-favorites-btn").style.display = "none"; // Hide the "View Favorites Map" button
  }
});

function handleSearch(event) {
  if (event.key === "Enter") {
    searchCountryOrState();
    event.preventDefault();
  }
}

function searchCountryOrState() {
  if (!usStatesData) {
    console.log("Data not available yet. Waiting...");
    return;
  }

  var searchQuery = searchInput.value.toLowerCase();

  // Clear the country details and map
  countryDetailsElement.innerHTML = "";
  if (map) {
    map.remove();
    map = null;
  }

  if (!searchQuery) {
    errorElement.style.display = "none";
    return;
  }

  // Convert object keys to an array
  var stateArray = Object.values(usStatesData);

  var state = stateArray.find(s => s.name.toLowerCase() === searchQuery);
  if (state) {
    displayStateInfo(state);
    displayMap(state.latitude, state.longitude);
    errorElement.style.display = "none";
  } else {
    fetch("https://restcountries.com/v2/name/" + searchQuery)
      .then(response => {
        if (!response.ok) {
          throw new Error("Country not found");
        }
        return response.json();
      })
      .then(data => {
        if (data.length === 0) {
          throw new Error("Country or US state not found");
        } else {
          var country = data[0];
          if (country.region === "Americas") {
            var usState = stateArray.find(s => s.name.toLowerCase() === country.name.toLowerCase());
            if (usState) {
              displayStateInfo(usState);
              displayMap(usState.latitude, usState.longitude);
            } else {
              displayCountryInfo(country);
              displayMap(country.latlng[0], country.latlng[1]);
            }
          } else {
            displayCountryInfo(country);
            displayMap(country.latlng[0], country.latlng[1]);
          }
          errorElement.style.display = "none";
        }
      })
      .catch(error => {
        console.log("An error occurred:", error);
        displayError("Country or US state not found");
      });
  }
}
function displayCountryInfo(country) {
  countryDetailsElement.innerHTML = "";

  var tableElement = document.createElement("table");

  var flagRow = document.createElement("tr");
  var flagCell = document.createElement("td");
  flagCell.className = "flag-cell";
  var flagImage = document.createElement("img");
  flagImage.src = country.flag;
  flagCell.appendChild(flagImage);
  flagRow.appendChild(flagCell);
  tableElement.appendChild(flagRow);

  // Check if borders property exists
  if (country.borders) {
    getBorderCountries(country.borders)
      .then(borderCountries => {
        var details = [
          { label: "Name", value: country.name },
          { label: "Population", value: country.population },
          { label: "Region", value: country.region },
          { label: "Capital", value: country.capital },
          { label: "Languages", value: country.languages.map(lang => lang.name).join(", ") },
          { label: "Currencies", value: country.currencies.map(curr => curr.name).join(", ") },
          { label: "Borders", value: borderCountries.join(", ") }
        ];

        details.forEach(detail => {
          var row = document.createElement("tr");
          var labelCell = document.createElement("th");
          var valueCell = document.createElement("td");
          labelCell.textContent = detail.label;
          valueCell.textContent = detail.value;
          row.appendChild(labelCell);
          row.appendChild(valueCell);
          tableElement.appendChild(row);
        });

        // Add favorite button
        var favoriteButtonRow = document.createElement("tr");
        var favoriteButtonCell = document.createElement("td");
        favoriteButtonCell.setAttribute("colspan", "2");
        var favoriteButton = document.createElement("button");
        favoriteButton.textContent = "Add to Favorites";
        favoriteButton.addEventListener("click", function () {
          addFavorite(country);
        });
        favoriteButtonCell.appendChild(favoriteButton);
        favoriteButtonRow.appendChild(favoriteButtonCell);
        tableElement.appendChild(favoriteButtonRow);

        countryDetailsElement.appendChild(tableElement);
      })
      .catch(error => {
        console.log("An error occurred:", error);
        displayError("Failed to retrieve border country data");
      });
  } else {
    // Display country details without borders
    var details = [
      { label: "Name", value: country.name },
      { label: "Population", value: country.population },
      { label: "Region", value: country.region },
      { label: "Capital", value: country.capital },
      { label: "Languages", value: country.languages.map(lang => lang.name).join(", ") },
      { label: "Currencies", value: country.currencies.map(curr => curr.name).join(", ") },
      { label: "Borders", value: "No bordering countries" }
    ];

    details.forEach(detail => {
      var row = document.createElement("tr");
      var labelCell = document.createElement("th");
      var valueCell = document.createElement("td");
      labelCell.textContent = detail.label;
      valueCell.textContent = detail.value;
      row.appendChild(labelCell);
      row.appendChild(valueCell);
      tableElement.appendChild(row);
    });

    countryDetailsElement.appendChild(tableElement);
  }
}

function displayStateInfo(state) {
  countryDetailsElement.innerHTML = "";

  var tableElement = document.createElement("table");

  var nameRow = document.createElement("tr");
  var nameHeader = document.createElement("th");
  nameHeader.textContent = "Name";
  var nameData = document.createElement("td");
  nameData.textContent = state.name;
  nameRow.appendChild(nameHeader);
  nameRow.appendChild(nameData);
  tableElement.appendChild(nameRow);

  var capitalRow = document.createElement("tr");
  var capitalHeader = document.createElement("th");
  capitalHeader.textContent = "Capital";
  var capitalData = document.createElement("td");
  capitalData.textContent = state.capital;
  capitalRow.appendChild(capitalHeader);
  capitalRow.appendChild(capitalData);
  tableElement.appendChild(capitalRow);

  var largestCityRow = document.createElement("tr");
  var largestCityHeader = document.createElement("th");
  largestCityHeader.textContent = "Largest City";
  var largestCityData = document.createElement("td");
  largestCityData.textContent = state.largest_city;
  largestCityRow.appendChild(largestCityHeader);
  largestCityRow.appendChild(largestCityData);
  tableElement.appendChild(largestCityRow);

  var abbreviationRow = document.createElement("tr");
  var abbreviationHeader = document.createElement("th");
  abbreviationHeader.textContent = "Abbreviation";
  var abbreviationData = document.createElement("td");
  abbreviationData.textContent = state.abbreviation;
  abbreviationRow.appendChild(abbreviationHeader);
  abbreviationRow.appendChild(abbreviationData);
  tableElement.appendChild(abbreviationRow);

  var areaRow = document.createElement("tr");
  var areaHeader = document.createElement("th");
  areaHeader.textContent = "Area";
  var areaData = document.createElement("td");
  areaData.textContent = state.area;
  areaRow.appendChild(areaHeader);
  areaRow.appendChild(areaData);
  tableElement.appendChild(areaRow);

  var populationRow = document.createElement("tr");
  var populationHeader = document.createElement("th");
  populationHeader.textContent = "Population";
  var populationData = document.createElement("td");
  populationData.textContent = state.population;
  populationRow.appendChild(populationHeader);
  populationRow.appendChild(populationData);
  tableElement.appendChild(populationRow);

  countryDetailsElement.appendChild(tableElement);
}



function getBorderCountries(borderCodes) {
  var promises = borderCodes.map(borderCode => {
    return fetch("https://restcountries.com/v2/alpha/" + borderCode)
      .then(response => {
        if (!response.ok) {
          throw new Error("Border country not found");
        }
        return response.json();
      })
      .then(data => data.name)
      .catch(error => {
        console.log("An error occurred:", error);
        return borderCode; // If the border country data couldn't be fetched, use the border code instead
      });
  });

  return Promise.all(promises);
}

function addFavorite(country) {
  console.log("Adding favorite:", country);

  if (!currentUser) {
    console.log("User is not logged in");
    return;
  }

  var favorite = {
    name: country.name,
    flag: country.flag,
    population: country.population,
    region: country.region,
    capital: country.capital,
    latitude: country.latlng ? country.latlng[0] : null,
    longitude: country.latlng ? country.latlng[1] : null
    // Add more properties as needed
  };

  var userFavoritesRef = favoritesRef.child(currentUser.uid);

  userFavoritesRef.push(favorite)
    .then(() => {
      console.log("Favorite added successfully");
    })
    .catch(error => {
      console.error("Failed to add favorite:", error);
    });
}

function removeFavorite(favoriteKey) {
  if (!currentUser) {
    console.log("User is not logged in");
    return;
  }

  favoritesRef.child(currentUser.uid).child(favoriteKey).remove()
    .then(() => {
      console.log("Favorite removed successfully");
    })
    .catch(error => {
      console.error("Failed to remove favorite:", error);
    });
}

function renderFavorites(favorites) {
  var favoritesList = document.getElementById("favorites-list");
  favoritesList.innerHTML = ""; // Clear previous favorites

  if (!favorites) {
    console.log("No favorites found");
    return;
  }

  // Create a list item for each favorite country
  Object.entries(favorites).forEach(([key, value]) => {
    var favoriteItem = document.createElement("li");
    favoriteItem.textContent = value.name;
    favoriteItem.addEventListener("click", function () {
      displayFavorite(value);
    });

    // Add a remove button for each favorite country
    var removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the favorite item click event from firing
      removeFavorite(key); // Pass the key of the favorite to be removed
    });

    favoriteItem.appendChild(removeButton);
    favoritesList.appendChild(favoriteItem);
  });
}

function displayFavorite(favorite) {
  displayCountryInfo(favorite);
  // Scroll to the top of the page or desired location
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayMap(latitude, longitude) {
  // Remove the previous map instance if it exists
  if (map) {
    map.remove();
  }

  // Create a new map instance
  map = L.map('map').setView([latitude, longitude], 6);

  // Add the tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  // Add a marker to the map
  L.marker([latitude, longitude]).addTo(map);
}

function displayError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function showRegistration() {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("register-container").style.display = "block";
}

function login() {
  var email = document.getElementById("login-email").value;
  var password = document.getElementById("login-password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => {
      console.log("Login successful");
    })
    .catch(error => {
      console.error("Login error:", error);
    });
}

function register() {
  var name = document.getElementById("register-name").value;
  var email = document.getElementById("register-email").value;
  var password = document.getElementById("register-password").value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => {
      console.log("Registration successful");
    })
    .catch(error => {
      console.error("Registration error:", error);
    });
}

function logout() {
  firebase.auth().signOut()
    .then(() => {
      console.log("Logout successful");
    })
    .catch(error => {
      console.error("Logout error:", error);
    });
}

function showFavoritesMap() {
  if (!currentUser) {
    console.log("User is not logged in");
    return;
  }

  // Clear the favorites-map container
  var favoritesMapContainer = document.getElementById("favorites-map");
  favoritesMapContainer.innerHTML = "";

  // Fetch favorite countries for the user
  favoritesRef.child(currentUser.uid).once('value')
    .then(snapshot => {
      const favorites = snapshot.val();
      console.log("Favorites loaded:", favorites);

      // Generate a map URL for each favorite country
      var mapUrls = Object.values(favorites).map(favorite => {
        const mapLanguage = "en_US"; // English language
        return `https://static-maps.yandex.ru/1.x/?ll=${favorite.longitude},${favorite.latitude}&size=400,300&z=3&l=map&pt=${favorite.longitude},${favorite.latitude},pm2dbl&lang=${mapLanguage}`;
      });

      // Create an image element for each map URL
      mapUrls.forEach(mapUrl => {
        var mapImage = document.createElement("img");
        mapImage.src = mapUrl;
        favoritesMapContainer.appendChild(mapImage);
      });
    })
    .catch(error => {
      console.error("Failed to fetch favorites:", error);
    });
}
