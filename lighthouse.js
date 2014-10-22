var clientId = 'squarespace-integration'
var clientSecret = 'sJxIZ0Vv4kkGqH3oQhkga8VxJUjqE4nAzEeGze7RcF4Kk9KJmcN7tbcsJyg6f5M8'
var curriculum = {
  'Monday': {
    'Introduction to the Maker Mindset': [
      'Understanding the Maker Mindset',
      'Understanding Systems Development',
      'Understanding High Performance Learning',
      'Understanding How Experts Use Computers'
    ],
    'Crossing the Boundary between User and Maker': [
      'Exploring Data Collection',
      'Exploring Data in Motion',
      'Exploring Data Lifecycle Management',
      'Exploring Data Visualization'
    ]
  },
  'Tuesday': {
    '3 Apps in 3 Hours - Set I': [
      'Working with Data Collection',
      'Working with Data in Motion',
      'Working with Data Lifecycle Management',
      'Working with Data Visualization'
    ],
    'Developing Functional Literacy in Technology': [
      'Understanding Software Engineering',
      'Understanding Software Quality',
      'Understanding Software Programming',
      'Understanding Software Execution Artifacts and Context'
    ]
  },
  'Wednesday': {
    '3 Apps in 3 Hours - Set II': [
      'Defend Data Collection',
      'Defend Data in Motion',
      'Defend Data Lifecycle Management',
      'Defend Data Visualization'
    ],
    'Patterns of Sensible Design': [
      'Understanding UX - Convention over Configuration',
      'Embracing the Minimum Viable Product (MVP)',
      'Practical Rapid Prototyping'
    ],
    'Working with APIs': [
      'Dissecting an API',
      'Exploring Great APIs',
      'Practical Application of APIs'
    ]
  },
  'Thusday': {
    'Week in Review': [
      'Review Maker Mindset and High Performance Learning',
      'Review Tools for Rapid Application Development',
      'Review Lessons Learned in Software Engineering'
    ]
  },
  'Friday': {
    'Sprint 1': [
      'Planning and Project Initiation',
      'Build your MVP',
      'Deploy, Test, and Document your MVP'
    ],
    'Sprint 2': [
      'Receiving Feedback on your MVP',
      'Live MVP Demonstrations'
    ]
  }
}


authenticateWithPodio(function() {
  getCurrentUserFromPodio()
  getAllUsersFromPodio(function() {
    render(curriculum)
    markCompletedItems()
  })
})

function authenticateWithPodio (callback) {
  if (hasAuthenticatedWithPodio()) {
    getAccessTokenFromPodio(callback)
  } else {
    oAuthWithPodio()
  }
}

function hasAuthenticatedWithPodio () {
  return window.location.search.match(/code=/)
}

// User must sign into podio so we can access API
function oAuthWithPodio () {
  window.location.href = 'https://podio.com/oauth/authorize?' +
    'client_id=' + clientId +
    '&redirect_uri=' + window.location.href.replace(/code=(.*)(?=&)/g, '')
}

// Gets API access token after user has authenticated with Podio
function getAccessTokenFromPodio (callback) {
  var code = window.location.search.match(/code=(.*)(?=&)/)[1];
  $.post('https://podio.com/oauth/token', {
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: window.location.href,
    client_secret: clientSecret,
    code: code
  }, function(response) {
    window.accessToken = response.access_token;
    callback()
  }).fail(function() {
    oAuthWithPodio()
  })
}

function render(coursework) {
  $('#template').html(template(coursework))
}

function template(coursework) {
  var template = ''
  var moduleCounter = 0
  for (var day in coursework) {
    template += '<h2>' + day + '</h2><ul>'
    for (var module in coursework[day]) {
      ++moduleCounter
      template += '<li><p><strong><a href="/module-' + moduleCounter +
        '">' + module + '</a></strong></p><ul>'
      coursework[day][module].forEach(function(activity, index) {
        var activityPlacement = 'activity-' + moduleCounter + '-' + (index + 1)
        template += '<li><div class="col sqs-col-6 span-6">' +
          '<a href="/' + activityPlacement + 
          '?SQF_EMAIL=' + window.currentUser +
          '&SQF_ACTIVITY=' + activityPlacement +
          '">' + activity +
          '</div><div class="col sqs-col-6 span-6">'
        var personCounter = 0;
        for (var person in window.people) {
          ++personCounter
          template += '<div ' +
            'style="height: 20px;width:20px;background-color:grey;display:inline-block;">' +
            '<img src="" ' +
            'style="height: 20px;width:20px;position:absolute;margin-right:2px;" ' +
            'data-item="' + activityPlacement + '" data-me="' +
            (personCounter === 1) + '"></div>'
        }
        template += '</div></li>'
      })
      template += '</ul>'
    }
    template += '</ul>'
  }
  return template
}

// queryPodioAPI({verb: 'GET', endpoint: '/user', callback: function(){...}})
function queryPodioAPI(options) {
  $.ajax('https://api.podio.com' + options.endpoint, {
    type: options.verb,
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', 'OAuth2 ' + window.accessToken);
    },
    success: options.callback
  })
}

// sets window.currentUser as the email of the authenticated user
function getCurrentUserFromPodio () {
  queryPodioAPI({
    verb: 'GET',
    endpoint: '/user',
    callback: function(profile) {
      window.currentUser = profile.mails[0].mail
    }
  })
}

// sets window.people as an object with email-avatar key-value pairs
function getAllUsersFromPodio (callback) {
  queryPodioAPI({
    verb: 'GET',
    endpoint: '/space/2664896/member/',
    callback: function(profiles) {
      window.people = {}
      profiles.forEach(function(person) {
        if(person.profile.image) {
          window.people[person.user.mail] = person.profile.image.thumbnail_link
        } else {
          window.people[person.user.mail] = 'http://www.fbcoverfx.com/images/blank_avtar.gif'
        }
      })
      callback()
    }
  })
}

// true if email matches current user email, false otherwise
function isCurrentUser(email) {
  return window.currentUser === email
}

function markCompletedItems () {
  queryPodioAPI({
    verb: 'POST',
    endpoint: '/item/app/9757424/filter/',
    callback: function(completedItems) {
      completedItems.items.forEach(function(completedItem) {
        markItemComplete(completedItem)
      })
    }
  })
}

function markItemComplete (item) {
  var email = item.fields[0].values[0].value
  var activityNumber = item.fields[1].values[0].value.replace(/<p>|<\/p>/g, '');
  if (isCurrentUser(email)) {
    var $image = firstImageForActivity(activityNumber)
  } else {
    var $image = emptyImageForActivity(activityNumber)
  }
  $image.attr('src', window.people[email])
}

function firstImageForActivity (number) {
  return $('img[data-item="' + number + '"][data-me=true]')
}

function emptyImageForActivity (number) {
  return $($('img[data-item="' + number + '"][data-me=false][src=""]')[0])
}
