class TimelineVisualization {
    constructor() {
        this.selectedPeople = new Set();
        this.minDate = null;
        this.maxDate = null;
        this.containerWidth = 0;
        this.people = [];
        this.language = 'en';  // Default language
        this.languageColors = {}; // Store language colors
        
        // Add language button handler
        const langButton = document.getElementById('langButton');
        langButton.addEventListener('click', () => {
            // Store currently selected IDs before recreating filters
            const selectedIds = Array.from(this.selectedPeople).map(person => person.id);
            const hasSelection = selectedIds.length > 0;
            
            this.language = this.language === 'en' ? 'ru' : 'en';
            langButton.textContent = this.language.toUpperCase();
            
            // Update the heading text
            const heading = document.querySelector('.filters h2');
            heading.textContent = this.language === 'en' ? 'Lifetimes' : 'Годы жизни';
            
            // Clear the current selection set but remember we had selections
            this.selectedPeople.clear();
            
            // Recreate filters with new language
            this.createFilters();
            
            // Restore checkbox states and selected people
            selectedIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = true;
                    const person = this.people.find(p => p.id === id);
                    if (person) {
                        this.selectedPeople.add(person);
                    }
                }
            });
            
            // Update clear button text and ensure visibility if needed
            const clearButton = document.getElementById('clearSelection');
            if (clearButton) {
                clearButton.textContent = this.language === 'en' ? 'Clear selection' : 'Очистить выбранное';
                if (hasSelection) {
                    clearButton.style.display = 'block';
                }
            }
            
            // Update visualization with maintained selection
            this.updateVisualization();
        });
    }

    async init() {
        try {
            const basePath = window.location.pathname.endsWith('/') 
                ? window.location.pathname 
                : window.location.pathname + '/';
            
            // First load language colors
            try {
                const colorResponse = await fetch(basePath + 'data/language_colors.json');
                if (colorResponse.ok) {
                    this.languageColors = await colorResponse.json();
                } else {
                    console.error('Error loading language colors');
                    this.languageColors = {}; // Use empty object if colors can't be loaded
                }
            } catch (colorError) {
                console.error('Error loading language colors:', colorError);
                this.languageColors = {}; // Use empty object if colors can't be loaded
            }
            
            // Then load people data
            const response = await fetch(basePath + 'data/people.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.people = await response.json();

            this.createFilters();
            this.updateTimeRange();
            
            window.addEventListener('resize', () => {
                this.updateVisualization();
            });
        } catch (error) {
            console.error('Error loading people data:', error);
            const container = document.querySelector('.container');
            container.innerHTML = '<div class="error-message">Data load error</div>';
        }
    }

    updateTimeRange() {
        if (this.selectedPeople.size === 0) {
            // If no people selected, show full range
            const allDates = this.people.flatMap(person => [
                this.parseDate(person.data.birth.earliest),
                this.parseDate(person.data.birth.latest),
                this.parseDate(person.data.death.earliest),
                this.parseDate(person.data.death.latest)
            ]);
            this.minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
            this.maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        } else {
            // Calculate range only for selected people
            const selectedDates = Array.from(this.selectedPeople).flatMap(person => [
                this.parseDate(person.data.birth.earliest),
                this.parseDate(person.data.birth.latest),
                this.parseDate(person.data.death.earliest),
                this.parseDate(person.data.death.latest)
            ]);
            this.minDate = new Date(Math.min(...selectedDates.map(d => d.getTime())));
            this.maxDate = new Date(Math.max(...selectedDates.map(d => d.getTime())));
        }

        this.createTimeAxis();
        this.updateVisualization();
    }

    parseDate(dateString) {
        // Handle BCE dates (with minus sign)
        if (dateString.startsWith('-')) {
            const parts = dateString.substring(1).split('-');
            const year = -parseInt(parts[0], 10); // Make year negative
            const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0; // Months are 0-indexed
            const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
            return new Date(year, month, day);
        } else {
            // Handle CE dates
            const parts = dateString.split('-');
            
            // Ensure year has 4 digits by padding with zeros if needed
            let year = parts[0];
            if (year.length < 4) {
                year = year.padStart(4, '0');
            }
            
            const month = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0; // Months are 0-indexed
            const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
            
            return new Date(`${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
        }
    }

    formatDate(date) {
        const year = date.getFullYear();
        if (year < 0) {
            return `${Math.abs(year)} BCE`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    createTimeAxis() {
        const container = document.getElementById('timeAxis');
        container.innerHTML = '';
        this.containerWidth = container.offsetWidth;
        
        const timeSpan = this.maxDate.getTime() - this.minDate.getTime();
        const yearSpan = this.maxDate.getFullYear() - this.minDate.getFullYear();
        
        // Calculate appropriate step size based on year span
        let stepSize = Math.ceil(yearSpan / 10);
        
        // Ensure we have at least one marker for small ranges
        if (stepSize === 0) stepSize = 1;
        
        // Adjust starting year to ensure we include important years
        let startYear = Math.floor(this.minDate.getFullYear() / stepSize) * stepSize;
        
        // Create array of years to display
        const years = [];
        
        // Add all years at regular intervals
        for (let year = startYear; year <= this.maxDate.getFullYear(); year += stepSize) {
            // Skip years outside our range and year 0
            if (year < this.minDate.getFullYear() || year === 0) continue;
            years.push(year);
        }
        
        // Check if we need to add year 0 (if timeline crosses from BCE to CE)
        if (this.minDate.getFullYear() < 0 && this.maxDate.getFullYear() > 0) {
            // Find the closest negative and positive years in our array
            const negativeYears = years.filter(y => y < 0);
            const positiveYears = years.filter(y => y > 0);
            
            // Ensure we have at least one positive year marker
            if (positiveYears.length === 0 && this.maxDate.getFullYear() > 0) {
                // Add the first CE year that's a multiple of the step size
                for (let year = stepSize; year <= this.maxDate.getFullYear(); year += stepSize) {
                    years.push(year);
                    break; // Just add one year
                }
                
                // If still no positive years, add the max year
                if (years.filter(y => y > 0).length === 0) {
                    years.push(this.maxDate.getFullYear());
                }
                
                // Sort the array to maintain chronological order
                years.sort((a, b) => a - b);
            }
            
            if (negativeYears.length > 0 && positiveYears.length > 0) {
                const closestNegative = Math.max(...negativeYears);
                const closestPositive = Math.min(...positiveYears);
                
                // Add year 0 to our array
                years.push(0);
                
                // Sort the array to maintain chronological order
                years.sort((a, b) => a - b);
            }
        }
        
        // Create markers for each year
        years.forEach(year => {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            if (year < 0) {
                marker.textContent = `-${Math.abs(year)}`;
            } else {
                marker.textContent = year;
            }
            
            let position;
            
            if (year === 0) {
                // For year 0, interpolate position between closest negative and positive years
                const negativeYears = years.filter(y => y < 0);
                const positiveYears = years.filter(y => y > 0);
                const closestNegative = Math.max(...negativeYears);
                const closestPositive = Math.min(...positiveYears);
                
                // Get positions of closest years
                const negDate = new Date(closestNegative, 0, 1);
                const posDate = new Date(closestPositive, 0, 1);
                const negPos = ((negDate.getTime() - this.minDate.getTime()) / timeSpan) * 100;
                const posPos = ((posDate.getTime() - this.minDate.getTime()) / timeSpan) * 100;
                
                // Interpolate position
                position = (negPos + posPos) / 2;
            } else {
                // Normal position calculation for other years
                const date = new Date(year, 0, 1);
                position = ((date.getTime() - this.minDate.getTime()) / timeSpan) * 100;
            }
            
            marker.style.left = `${position}%`;
            container.appendChild(marker);
        });
    }

    updateVisualization() {
        const container = document.getElementById('timelines');
        container.innerHTML = '';
        
        const timeSpan = this.maxDate.getTime() - this.minDate.getTime();
        
        const sortedPeople = Array.from(this.selectedPeople)
            .sort((a, b) => {
                // First compare by birth date
                const dateComparison = this.parseDate(a.data.birth.earliest).getTime() - 
                                      this.parseDate(b.data.birth.earliest).getTime();
                if (dateComparison !== 0) return dateComparison;

                // If birth dates are identical, compare sort names in order according to current language
                if (a.data.name.sort?.[this.language] !== b.data.name.sort?.[this.language]) {
                    return (a.data.name.sort?.[this.language] || '').localeCompare(b.data.name.sort?.[this.language] || '', this.language);
                }
                return 0;
            });
        
        sortedPeople.forEach(person => {
            const timeline = document.createElement('div');
            timeline.className = 'timeline';
            
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = person.data.name.short[this.language];
            
            // Add this code to adjust font size based on text length
            const shortName = person.data.name.short[this.language];
            if (shortName.length > 15) {
                const fontSize = Math.max(9, 14 - Math.floor((shortName.length - 15) / 2));
                label.style.fontSize = `${fontSize}px`;
            }
            
            timeline.appendChild(label);
            
            const barWrapper = document.createElement('div');
            barWrapper.className = 'timeline-bars-wrapper';
            
            // Get language-based color
            const mainLanguage = person.data.mainLanguage || 'default';
            const barColor = this.languageColors[mainLanguage] || '#4CAF50';
            
            const certainBar = document.createElement('div');
            certainBar.className = 'timeline-bar certain';
            certainBar.style.backgroundColor = barColor;
            
            const earliestBirth = this.parseDate(person.data.birth.latest);
            const latestDeath = this.parseDate(person.data.death.earliest);
            
            const certainStartPosition = ((earliestBirth.getTime() - this.minDate.getTime()) / timeSpan) * 100;
            const certainWidth = ((latestDeath.getTime() - earliestBirth.getTime()) / timeSpan) * 100;
            
            certainBar.style.left = `${certainStartPosition}%`;
            certainBar.style.width = `${certainWidth}%`;
            
            if (person.data.birth.earliest !== person.data.birth.latest) {
                const uncertainBirthBar = document.createElement('div');
                uncertainBirthBar.className = 'timeline-bar uncertain left-uncertain';
                uncertainBirthBar.style.backgroundColor = barColor;
                const uncertainBirthStart = this.parseDate(person.data.birth.earliest);
                const uncertainBirthWidth = ((earliestBirth.getTime() - uncertainBirthStart.getTime()) / timeSpan) * 100;
                uncertainBirthBar.style.left = `${(uncertainBirthStart.getTime() - this.minDate.getTime()) / timeSpan * 100}%`;
                uncertainBirthBar.style.width = `${uncertainBirthWidth}%`;
                barWrapper.appendChild(uncertainBirthBar);
            }
            
            barWrapper.appendChild(certainBar);
            
            if (person.data.death.earliest !== person.data.death.latest) {
                const uncertainDeathBar = document.createElement('div');
                uncertainDeathBar.className = 'timeline-bar uncertain right-uncertain';
                uncertainDeathBar.style.backgroundColor = barColor;
                const uncertainDeathEnd = this.parseDate(person.data.death.latest);
                const uncertainDeathWidth = ((uncertainDeathEnd.getTime() - latestDeath.getTime()) / timeSpan) * 100;
                uncertainDeathBar.style.left = `${(latestDeath.getTime() - this.minDate.getTime()) / timeSpan * 100}%`;
                uncertainDeathBar.style.width = `${uncertainDeathWidth}%`;
                barWrapper.appendChild(uncertainDeathBar);
            }
            
            timeline.appendChild(barWrapper);
            
            // Create tooltip text with birth names and label dates
            let tooltipText = person.data.name.full[this.language];
            if (person.data.name.born) {
                if (Array.isArray(person.data.name.born)) {
                    const bornNames = person.data.name.born
                        .map(n => n.full[this.language])
                        .join(' / ');
                    tooltipText += ` (${bornNames})`;
                } else {
                    tooltipText += ` (${person.data.name.born.full[this.language]})`;
                }
            }
            tooltipText += `\n${person.data.birth.label} – ${person.data.death.label}`;
            if (person.data.name.alias && person.data.name.alias.length > 0) {
                const aliases = person.data.name.alias.map(a => a[this.language]).join(', ');
                const aliasLabel = this.language === 'en' ? 'Aliases' : 'Псевдонимы';
                tooltipText += `\n${aliasLabel}: ${aliases}`;
            }
            
            timeline.title = tooltipText;
            
            container.appendChild(timeline);
        });
    }

    createFilters() {
        const container = document.getElementById('peopleFilters');
        container.innerHTML = '';
        
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-box';
        searchInput.placeholder = this.language === 'en' ? 'Search' : 'Поиск';
        
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';
        
        const clearButton = document.createElement('button');
        clearButton.textContent = this.language === 'en' ? 'Clear selection' : 'Очистить выбранное';
        clearButton.id = 'clearSelection';
        clearButton.style.display = this.selectedPeople.size > 0 ? 'block' : 'none';
        clearButton.addEventListener('click', () => {
            this.selectedPeople.clear();
            document.querySelectorAll('.dropdown-container input[type="checkbox"]')
                .forEach(checkbox => checkbox.checked = false);
            clearButton.style.display = 'none';
            this.updateVisualization();
        });
        
        const sortedPeople = [...this.people].sort((a, b) => {
            // Compare sort names in current language
            if (a.data.name.sort?.[this.language] !== b.data.name.sort?.[this.language]) {
                return (a.data.name.sort?.[this.language] || '').localeCompare(b.data.name.sort?.[this.language] || '', this.language);
            }
            // If all names are equal, sort by birth date
            return this.parseDate(a.data.birth.earliest).getTime() - 
                   this.parseDate(b.data.birth.earliest).getTime();
        });
        
        sortedPeople.forEach(person => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            
            const labelWrapper = document.createElement('div');
            labelWrapper.className = 'label-wrapper';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = person.id;
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedPeople.add(person);
                } else {
                    this.selectedPeople.delete(person);
                }
                clearButton.style.display = this.selectedPeople.size > 0 ? 'block' : 'none';
                this.updateTimeRange();
            });

            const label = document.createElement('label');
            label.htmlFor = person.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = person.data.name.search[this.language];
            
            const yearsSpan = document.createElement('span');
            yearsSpan.className = 'years';
            yearsSpan.textContent = ` (${person.data.birth.label_year} – ${person.data.death.label_year})`;
            
            label.appendChild(nameSpan);
            label.appendChild(yearsSpan);

            labelWrapper.appendChild(checkbox);
            labelWrapper.appendChild(label);
            div.appendChild(labelWrapper);
            dropdownContainer.appendChild(div);
        });

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            const checkboxItems = dropdownContainer.querySelectorAll('.checkbox-item');
            checkboxItems.forEach(item => {
                const nameSpan = item.querySelector('span');
                const name = nameSpan.textContent.toLowerCase();
                const personId = item.querySelector('input').id.replace('person-', '');
                const person = this.people.find(p => p.id === personId);
                
                // Use search field if available, otherwise fall back to short name
                const searchText = person.data.name.search?.[this.language]?.toLowerCase() || 
                                  person.data.name.short[this.language].toLowerCase();
                
                if (searchText.includes(searchTerm) || name.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        filterContainer.appendChild(searchInput);
        filterContainer.appendChild(dropdownContainer);
        filterContainer.appendChild(clearButton);
        container.appendChild(filterContainer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const timeline = new TimelineVisualization();
    timeline.init();
}); 