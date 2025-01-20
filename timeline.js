class TimelineVisualization {
    constructor() {
        this.selectedPeople = new Set();
        this.minDate = null;
        this.maxDate = null;
        this.containerWidth = 0;
        this.people = [];
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
            label.textContent = person.name.short;
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
            let tooltipText = person.name.full;
            if (person.name.born) {
                if (Array.isArray(person.name.born)) {
                    const bornNames = person.name.born.map(n => n.full).join(' / ');
                    tooltipText += ` (${bornNames})`;
                } else {
                    tooltipText += ` (${person.name.born.full})`;
                }
            }
            tooltipText += `\n${person.birth.label} – ${person.death.label}`;
            
            timeline.title = tooltipText;
            
            container.appendChild(timeline);
        });
    }

    createFilters() {
        const container = document.getElementById('peopleFilters');
        
        // Sort people by last name, first name, middle name, patronymic, and birth date
        const sortedPeople = [...this.people].sort((a, b) => {
            // Compare last names
            if (a.name.last !== b.name.last) {
                return a.name.last.localeCompare(b.name.last);
            }
            
            // If last names are equal, compare first names
            if (a.name.first !== b.name.first) {
                return a.name.first.localeCompare(b.name.first);
            }
            
            // If first names are equal, compare middle names
            if (a.name.middle !== b.name.middle) {
                return a.name.middle.localeCompare(b.name.middle);
            }
            
            // If middle names are equal, compare patronymic names
            if (a.name.patronymic !== b.name.patronymic) {
                return a.name.patronymic.localeCompare(b.name.patronymic);
            }
            
            // If all names are equal, compare birth dates
            return new Date(a.birth.earliest) - new Date(b.birth.earliest);
        });
        
        sortedPeople.forEach(person => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = person.id;
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedPeople.add(person);
                } else {
                    this.selectedPeople.delete(person);
                }
                this.updateTimeRange();
            });

            const label = document.createElement('label');
            label.htmlFor = person.id;
            
            // Create name span
            const nameSpan = document.createElement('span');
            nameSpan.textContent = person.name.sort;
            
            // Create years span with line break opportunity
            const yearsSpan = document.createElement('span');
            yearsSpan.className = 'years';
            yearsSpan.textContent = ` (${person.birth.label_year} – ${person.death.label_year})`;
            
            label.appendChild(nameSpan);
            label.appendChild(yearsSpan);

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const timeline = new TimelineVisualization();
    timeline.init();
}); 