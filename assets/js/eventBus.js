const EventBus = (function () {
  const events = {};

  function subscribe(event, callback) {
    if (!events[event]) {
      events[event] = [];
    }
    events[event].push(callback);

    return {
      unsubscribe: () => {
        events[event] = events[event].filter((cb) => cb !== callback);
        if (events[event].length === 0) {
          delete events[event];
        }
      },
    };
  }

  function publish(event, data) {
    if (!events[event]) {
      return;
    }

    events[event].forEach((callback) => {
      callback(data);
    });
  }

  return {
    subscribe,
    publish,
  };
})();

window.EventBus = EventBus;
