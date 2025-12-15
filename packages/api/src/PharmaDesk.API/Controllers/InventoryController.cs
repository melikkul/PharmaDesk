using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    /// <summary>
    /// REFACTORED: Thin Controller - delegating all business logic to IInventoryService
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User,Admin")] // RBAC: Only Pharmacy and Admin roles
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;

        public InventoryController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        private int GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                throw new UnauthorizedAccessException("User ID is missing or invalid.");
            return uid;
        }

        [HttpGet("me")]
        public async Task<ActionResult<IEnumerable<object>>> GetMyInventory()
        {
            try
            {
                var userId = GetUserId();
                var inventory = await _inventoryService.GetMyInventoryAsync(userId);
                return Ok(inventory);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddItemToInventory([FromBody] AddInventoryRequest req)
        {
            try
            {
                var userId = GetUserId();
                var result = await _inventoryService.AddInventoryItemAsync(req, userId);

                if (!result.Success)
                {
                    return result.ErrorCode switch
                    {
                        404 => NotFound(new { error = result.ErrorMessage }),
                        401 => Unauthorized(),
                        _ => BadRequest(new { error = result.ErrorMessage })
                    };
                }

                return CreatedAtAction(nameof(GetMyInventory), new { id = (result.Data as dynamic)?.Id }, result.Data);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInventoryItem(int id, [FromBody] UpdateInventoryRequest req)
        {
            try
            {
                var userId = GetUserId();
                var result = await _inventoryService.UpdateInventoryItemAsync(id, req, userId);

                if (!result.Success)
                {
                    return result.ErrorCode switch
                    {
                        404 => NotFound(new { error = result.ErrorMessage }),
                        401 => Unauthorized(),
                        _ => BadRequest(new { error = result.ErrorMessage })
                    };
                }

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInventoryItem(int id)
        {
            try
            {
                var userId = GetUserId();
                var result = await _inventoryService.DeleteInventoryItemAsync(id, userId);

                if (!result.Success)
                {
                    return result.ErrorCode switch
                    {
                        404 => NotFound(),
                        401 => Unauthorized(),
                        _ => BadRequest()
                    };
                }

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }
    }
}