# Webhook Action Data Format Guide

The following are some of the fields that will be made available via the Webhook action

**Note**: While the data for contacts as well as the sub-account (location) object will be available by default, other related objects such as appointments, tasks etc will ONLY be carried if the corresponding trigger is applied in the workflow.

For instance, date and time of appointments can only be retrieved if the workflow carries the reference of the appointment as an input trigger such as Appointment Booked. Similarly, Opportunity owner of various opportunities in the pipeline would only be available if the workflow has an Opportunity trigger such as Pipeline Changed.

In the releases ahead, we plan to provide a more robust set of configurable options to ensure our users are able to make the most of the feature.

```plain
{
  // Contact standard fields
  first_name,
  last_name,
  full_name,
  email,
  phone,
  tags,
  address1,
  city,
  state,
  country,
  timezone,
  date_created,
  postal_code,
  company_name,
  website,
  date_of_birth,
  contact_source,
  full_address,
  contact_type,
  gclid,

  ...
  ... Contact Custom Fields
  ...

  // Location Data mostly present alawys with all webhooks, key field: location
  location: {
      name,
      address,
      city,
      state,
      country,
      postalCode,
      fullAddress,
      id
  }

  // Opportunity if applicable, added on root level
  opportunity_name,
  status,
  lead_value,
  opportunity_source,
  source,
  pipleline_stage, // name of pipeline stage
  pipeline_id,
  id,
  pipeline_name,

  // Campaign if applicable, field key: campaign
  campaign: {
      id,
      name
  },

  // User if applicable, field key: user
  user: {
      firstName,
      lastName,
      email,
      phone,
      extension,
      address1,
      city,
      state,
      country,
      postalCode
  },

  // Appointment if applicable, field key: calendar 
  calendar: {
      id, // calendar id
      calendarName, // calendar.name,
      title, // appointment title
      selectedTimezone, // location timezone OR 'UTC'
      appointmentId,
      startTime: // startTime as per the selectedTimezone in format 'YYYY-MM-DDTHH:mm:ss'
      endTime: // endTime as per the selectedTimezone in format 'YYYY-MM-DDTHH:mm:ss'
      status,
      appoinmentStatus,
      address,
      notes,
      date_created,
      created_by, // user name if this is created by user
      created_by_user_id // user id if this is created by user
      created_by_meta: { // internal fields
        source,
        channel
      },
      last_updated_by_meta: { // internal fields
        source,
        channel
      }
  },

  // Two Step OrderForm if applicable, field key: order
  order: {
      ... // Dynamic data, please run the test in order to get example data
  },

  // Invoice if applicable, field key: invoice
  invoice: {
      ... // Dynamic data, please run the test in order to get example data
  },

  // Task if applicable, field key: task
  task: {
      title,
      body,
      dueDate: dueDate converted to UTC timezone with format 'YYYY-MM-DDTHH:mm:ss'
  }

  // Note if applicable, field key: note
  note: {
      body
  }

  // Message if applicable, field key: message
  message: {
      type,
      body,
      direction,
      status
  }

  // Workflow if applicable, field key: workflow
  workflow: {
      id,
      name
  }
}
```