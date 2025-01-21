class TimelineVisualization {
    constructor() {
        this.selectedPeople = new Set();
        this.minDate = null;
        this.maxDate = null;
        this.containerWidth = 0;
        this.people = [];
        this.language = 'en';  // Default language
        
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
            
            // Ensure clear button is visible if we had selections
            const clearButton = document.getElementById('clearSelection');
            if (clearButton && hasSelection) {
                clearButton.style.display = 'block';
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
                new Date(person.birth.earliest),
                new Date(person.birth.latest),
                new Date(person.death.earliest),
                new Date(person.death.latest)
            ]);
            this.minDate = new Date(Math.min(...allDates));
            this.maxDate = new Date(Math.max(...allDates));
        } else {
            // Calculate range only for selected people
            const selectedDates = Array.from(this.selectedPeople).flatMap(person => [
                new Date(person.birth.earliest),
                new Date(person.birth.latest),
                new Date(person.death.earliest),
                new Date(person.death.latest)
            ]);
            this.minDate = new Date(Math.min(...selectedDates));
            this.maxDate = new Date(Math.max(...selectedDates));
        }

        this.createTimeAxis();
        this.updateVisualization();
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    createTimeAxis() {
        const container = document.getElementById('timeAxis');
        container.innerHTML = '';
        this.containerWidth = container.offsetWidth;
        
        const timeSpan = this.maxDate.getTime() - this.minDate.getTime();
        const yearSpan = this.maxDate.getFullYear() - this.minDate.getFullYear();
        const stepSize = Math.ceil(yearSpan / 10);

        for (let year = this.minDate.getFullYear(); year <= this.maxDate.getFullYear(); year += stepSize) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.textContent = year;
            
            const date = new Date(year, 0, 1);
            const position = ((date.getTime() - this.minDate.getTime()) / timeSpan) * 100;
            marker.style.left = `${position}%`;
            
            container.appendChild(marker);
        }
    }

    updateVisualization() {
        const container = document.getElementById('timelines');
        container.innerHTML = '';
        
        const timeSpan = this.maxDate.getTime() - this.minDate.getTime();
        
        const sortedPeople = Array.from(this.selectedPeople)
            .sort((a, b) => new Date(a.birth.earliest) - new Date(b.birth.earliest));
        
        sortedPeople.forEach(person => {
            const timeline = document.createElement('div');
            timeline.className = 'timeline';
            
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = person.name.short[this.language];
            timeline.appendChild(label);
            
            const barWrapper = document.createElement('div');
            barWrapper.className = 'timeline-bars-wrapper';
            
            const certainBar = document.createElement('div');
            certainBar.className = 'timeline-bar certain';
            
            const earliestBirth = new Date(person.birth.latest);
            const latestDeath = new Date(person.death.earliest);
            
            const certainStartPosition = ((earliestBirth.getTime() - this.minDate.getTime()) / timeSpan) * 100;
            const certainWidth = ((latestDeath.getTime() - earliestBirth.getTime()) / timeSpan) * 100;
            
            certainBar.style.left = `${certainStartPosition}%`;
            certainBar.style.width = `${certainWidth}%`;
            
            if (person.birth.earliest !== person.birth.latest) {
                const uncertainBirthBar = document.createElement('div');
                uncertainBirthBar.className = 'timeline-bar uncertain left-uncertain';
                const uncertainBirthStart = new Date(person.birth.earliest);
                const uncertainBirthWidth = ((earliestBirth.getTime() - uncertainBirthStart.getTime()) / timeSpan) * 100;
                uncertainBirthBar.style.left = `${(uncertainBirthStart.getTime() - this.minDate.getTime()) / timeSpan * 100}%`;
                uncertainBirthBar.style.width = `${uncertainBirthWidth}%`;
                barWrapper.appendChild(uncertainBirthBar);
            }
            
            barWrapper.appendChild(certainBar);
            
            if (person.death.earliest !== person.death.latest) {
                const uncertainDeathBar = document.createElement('div');
                uncertainDeathBar.className = 'timeline-bar uncertain right-uncertain';
                const uncertainDeathEnd = new Date(person.death.latest);
                const uncertainDeathWidth = ((uncertainDeathEnd.getTime() - latestDeath.getTime()) / timeSpan) * 100;
                uncertainDeathBar.style.left = `${(latestDeath.getTime() - this.minDate.getTime()) / timeSpan * 100}%`;
                uncertainDeathBar.style.width = `${uncertainDeathWidth}%`;
                barWrapper.appendChild(uncertainDeathBar);
            }
            
            timeline.appendChild(barWrapper);
            
            // Create tooltip text with birth names and label dates
            let tooltipText = person.name.full[this.language];
            if (person.name.born) {
                if (Array.isArray(person.name.born)) {
                    const bornNames = person.name.born
                        .map(n => n.full[this.language])
                        .join(' / ');
                    tooltipText += ` (${bornNames})`;
                } else {
                    tooltipText += ` (${person.name.born.full[this.language]})`;
                }
            }
            tooltipText += `\n${person.birth.label} – ${person.death.label}`;
            if (person.name.alias && person.name.alias.length > 0) {
                const aliases = person.name.alias.map(a => a[this.language]).join(', ');
                tooltipText += `\nAliases: ${aliases}`;
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
        searchInput.placeholder = 'Search people...';
        searchInput.className = 'search-input';
        
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';
        
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear selection';
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
            // Compare last names in current language
            if (a.name.last?.[this.language] !== b.name.last?.[this.language]) {
                return (a.name.last?.[this.language] || '').localeCompare(b.name.last?.[this.language] || '', this.language);
            }
            // Compare first names
            if (a.name.first?.[this.language] !== b.name.first?.[this.language]) {
                return (a.name.first?.[this.language] || '').localeCompare(b.name.first?.[this.language] || '', this.language);
            }
            // Compare middle names if they exist
            if (a.name.middle?.[this.language] !== b.name.middle?.[this.language]) {
                return (a.name.middle?.[this.language] || '').localeCompare(b.name.middle?.[this.language] || '', this.language);
            }
            // Compare patronymics if they exist
            if (a.name.patronymic?.[this.language] !== b.name.patronymic?.[this.language]) {
                return (a.name.patronymic?.[this.language] || '').localeCompare(b.name.patronymic?.[this.language] || '', this.language);
            }
            // If all names are equal, sort by birth date
            return new Date(a.birth.earliest) - new Date(b.birth.earliest);
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
            nameSpan.textContent = person.name.sort[this.language];
            
            const yearsSpan = document.createElement('span');
            yearsSpan.className = 'years';
            yearsSpan.textContent = ` (${person.birth.label_year} – ${person.death.label_year})`;
            
            label.appendChild(nameSpan);
            label.appendChild(yearsSpan);

            labelWrapper.appendChild(checkbox);
            labelWrapper.appendChild(label);
            div.appendChild(labelWrapper);
            dropdownContainer.appendChild(div);
        });

        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            const items = dropdownContainer.getElementsByClassName('checkbox-item');
            
            Array.from(items).forEach(item => {
                const label = item.querySelector('label');
                const text = label.textContent.toLowerCase();
                item.style.display = text.includes(searchText) ? 'block' : 'none';
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