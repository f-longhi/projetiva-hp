class CalendarWidget {
   constructor(parentElement, {year, month}) {
     this.year = year;
     this.month = month;
     this.dom = null;
     this.parentElement = parentElement;
     this.monthNames = [
       'Janeiro',
       'Fevereiro',
       'Março',
       'Abril',
       'Maio',
       'Junho',
       'Julho',
       'Agosto',
       'Setembro',
       'Outubro',
       'Novembro',
       'Dezembro'
     ];
   }
   _getLastDay(year, month) {
     let date = new Date(year, month + 1, 1);
     date.setDate(date.getDate() - 1);
     return date.getDate();
   }
   _isToday(date) {
     const today = new Date();
     if (date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()) {
       return true;
     }
     return false;
   }
   _createNavigation() {
     const navBar = document.createElement('div');
     navBar.className = 'calendar-navigation';
     
     const yearLabel = document.createElement('div');
     const yearBackCtrl = document.createElement('div');
     const yearForthCtrl = document.createElement('div');
     yearLabel.className = 'calendar-year-label';
     yearLabel.append(yearBackCtrl, String(this.year), yearForthCtrl);
     
     const monthLabel = document.createElement('div');
     const monthBackCtrl = document.createElement('div');
     const monthForthCtrl = document.createElement('div');
     monthLabel.className = 'calendar-month-label';
     monthLabel.append(monthBackCtrl, this.monthNames[this.month], monthForthCtrl);
     
     yearBackCtrl.className = monthBackCtrl.className = 'calendar-back';
     yearForthCtrl.className = monthForthCtrl.className = 'calendar-forth';
     
     yearBackCtrl.addEventListener('click', () => {
       this.year --;
       this.create();
     });
     yearForthCtrl.addEventListener('click', () => {
       this.year ++;
       this.create();
     });
     monthBackCtrl.addEventListener('click', () => {
       this.month --;
       if (this.month < 0) {
         this.year --;
         this.month = 11;
       }
       this.create();
     });
     monthForthCtrl.addEventListener('click', () => {
       this.month ++;
       if (this.month > 11) {
         this.year ++;
         this.month = 0;
       }
       this.create();
     });
     
     navBar.append(monthLabel, yearLabel);
     return navBar;
   }
   _createHeaders() {
     const thead = document.createElement('thead');
     const headrow = document.createElement('tr');
     thead.append(headrow);
     for(let day of 'D S T Q Q S S'.split(' ')) {
       const header = document.createElement('th');
       header.textContent = day;
       headrow.appendChild(header);
     }
     return thead;
   }
   create() {
     if (this.dom && this.dom.parentNode) {
       this.dom.parentNode.removeChild(this.dom);
     }
     
     const {year, month} = this;
     const dayOne = new Date(year, month, 1);
     const initialOffset = dayOne.getDay();
     
     const calendarWrapper = this.dom = document.createElement('div');
     calendarWrapper.className = 'calendar';
     
     calendarWrapper.appendChild(this._createNavigation());
     
     const table = document.createElement('table');
     const tbody = document.createElement('tbody');
     
     let firstRow = document.createElement('tr');
     tbody.append(firstRow);
     
     if (initialOffset >= 1) {
       const firstRowOffset = document.createElement('td');
       firstRowOffset.setAttribute('colspan', initialOffset);
       firstRow.append(firstRowOffset);          
     }
     
     for (let i = 1, lastDay = this._getLastDay(year, month); i <= lastDay; i++) {
       const currentDay = new Date(year, month, i);
       const dayCell = document.createElement('td');
       dayCell.textContent = i;
       firstRow.append(dayCell);
       if (this._isToday(currentDay)) {
         dayCell.classList.add('highlight');
       }
       if (currentDay.getDay() === 6) {
         firstRow = document.createElement('tr');
         tbody.append(firstRow);
       }
     }
     
     table.append(this._createHeaders());
     table.append(tbody);
     
     calendarWrapper.append(table);
     this.parentElement.append(calendarWrapper);
   }
 }
